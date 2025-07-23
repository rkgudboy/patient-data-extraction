import { Patient } from '../models/Patient';
import { IPatient, PatientDocument, DuplicateAnalysis, MatchResult } from '../types';

export class DuplicateChecker {
  
  static async analyzeDuplicates(extractedData: Partial<IPatient>): Promise<DuplicateAnalysis> {
    const { name, age, country, countryData } = extractedData;
    
    const suggestions: DuplicateAnalysis['suggestions'] = [];
    const validationErrors: string[] = [];
    
    // Find potential duplicates
    const duplicatePatients = await this.findDuplicates(extractedData);
    
    // Generate suggestions based on partial matches
    if (duplicatePatients.length > 0) {
      for (const duplicate of duplicatePatients) {
        if (this.calculateNameSimilarity(name || '', duplicate.name) > 0.8) {
          suggestions.push({
            field: 'name',
            suggestedValue: duplicate.name,
            confidence: this.calculateNameSimilarity(name || '', duplicate.name)
          });
        }
      }
    }
    
    // Validate required fields based on country
    this.validateCountrySpecificFields(extractedData, validationErrors);
    
    return {
      isDuplicate: duplicatePatients.length > 0,
      duplicatePatients,
      suggestions,
      validationErrors
    };
  }
  
  static async findMatches(searchData: Partial<IPatient>): Promise<MatchResult> {
    const exactMatches: PatientDocument[] = [];
    const partialMatches: MatchResult['partialMatches'] = [];
    
    // Build query for exact matches
    const exactQuery: any = {};
    if (searchData.name) exactQuery.name = new RegExp(searchData.name, 'i');
    if (searchData.age) exactQuery.age = searchData.age;
    if (searchData.country) exactQuery.country = searchData.country;
    
    // Add country-specific exact matches
    if (searchData.countryData) {
      const countryData = searchData.countryData;
      if (countryData.nhsNumber) exactQuery['countryData.nhsNumber'] = countryData.nhsNumber;
      if (countryData.mrn) exactQuery['countryData.mrn'] = countryData.mrn;
      if (countryData.hospitalUidAadhaar) exactQuery['countryData.hospitalUidAadhaar'] = countryData.hospitalUidAadhaar;
    }
    
    const exactResults = await Patient.find(exactQuery).lean() as PatientDocument[];
    exactMatches.push(...exactResults);
    
    // Find partial matches using text search
    if (searchData.name) {
      const textSearchResults = await Patient.find({
        $text: { $search: searchData.name },
        country: searchData.country,
        _id: { $nin: exactMatches.map(p => p._id).filter(id => id) }
      }).lean() as PatientDocument[];
      
      for (const result of textSearchResults) {
        const matchScore = this.calculateOverallMatchScore(searchData, result);
        if (matchScore > 0.5) {
          partialMatches.push({ patient: result, matchScore });
        }
      }
    }
    
    // Sort partial matches by score
    partialMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    return { exactMatches, partialMatches };
  }
  
  private static async findDuplicates(extractedData: Partial<IPatient>): Promise<PatientDocument[]> {
    const queries: any[] = [];
    
    // Check by unique identifiers first
    if (extractedData.countryData) {
      const { countryData } = extractedData;
      
      if (countryData.nhsNumber) {
        queries.push({ 'countryData.nhsNumber': countryData.nhsNumber });
      }
      if (countryData.mrn) {
        queries.push({ 'countryData.mrn': countryData.mrn });
      }
      if (countryData.hospitalUidAadhaar) {
        queries.push({ 'countryData.hospitalUidAadhaar': countryData.hospitalUidAadhaar });
      }
      if (countryData.ssn) {
        queries.push({ 'countryData.ssn': countryData.ssn });
      }
    }
    
    // Check by name and age combination
    if (extractedData.name && extractedData.age && extractedData.country) {
      queries.push({
        name: new RegExp(extractedData.name, 'i'),
        age: extractedData.age,
        country: extractedData.country
      });
    }
    
    if (queries.length === 0) return [];
    
    const duplicates = await Patient.find({
      $or: queries
    }).lean() as PatientDocument[];
    
    return duplicates;
  }
  
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    if (n1 === n2) return 1.0;
    
    // Levenshtein distance calculation
    const matrix = Array(n2.length + 1).fill(null).map(() => Array(n1.length + 1).fill(null));
    
    for (let i = 0; i <= n1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= n2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= n2.length; j++) {
      for (let i = 1; i <= n1.length; i++) {
        const indicator = n1[i - 1] === n2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(n1.length, n2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[n2.length][n1.length]) / maxLength;
  }
  
  private static calculateOverallMatchScore(searchData: Partial<IPatient>, patient: PatientDocument): number {
    let score = 0;
    let totalWeight = 0;
    
    // Name similarity (weight: 40%)
    if (searchData.name) {
      const nameScore = this.calculateNameSimilarity(searchData.name, patient.name);
      score += nameScore * 0.4;
      totalWeight += 0.4;
    }
    
    // Age match (weight: 20%)
    if (searchData.age !== undefined) {
      const ageScore = searchData.age === patient.age ? 1 : Math.max(0, 1 - Math.abs(searchData.age - patient.age) / 10);
      score += ageScore * 0.2;
      totalWeight += 0.2;
    }
    
    // Country match (weight: 10%)
    if (searchData.country) {
      const countryScore = searchData.country === patient.country ? 1 : 0;
      score += countryScore * 0.1;
      totalWeight += 0.1;
    }
    
    // Country-specific fields (weight: 30%)
    if (searchData.countryData && patient.countryData) {
      let countryFieldScore = 0;
      let countryFieldCount = 0;
      
      const fields = ['nhsNumber', 'mrn', 'hospitalUidAadhaar', 'ssn', 'healthInsurancePolicyNumber'];
      
      for (const field of fields) {
        const searchValue = (searchData.countryData as any)[field];
        const patientValue = (patient.countryData as any)[field];
        
        if (searchValue && patientValue) {
          countryFieldScore += searchValue === patientValue ? 1 : 0;
          countryFieldCount++;
        }
      }
      
      if (countryFieldCount > 0) {
        score += (countryFieldScore / countryFieldCount) * 0.3;
        totalWeight += 0.3;
      }
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }
  
  private static validateCountrySpecificFields(data: Partial<IPatient>, errors: string[]): void {
    if (!data.country || !data.countryData) return;
    
    const { country, countryData } = data;
    
    switch (country) {
      case 'UK':
        if (!data.name) errors.push('Name is required');
        if (!data.age) errors.push('Age is required');
        if (!countryData.nhsNumber) errors.push('NHS Number is required');
        else if (!/^[0-9]{10}$/.test(countryData.nhsNumber)) {
          errors.push('NHS Number must be 10 digits');
        }
        break;
        
      case 'US':
        if (!data.name) errors.push('Name is required');
        if (!data.age) errors.push('Age is required');
        if (!countryData.mrn) errors.push('Medical Record Number is required');
        if (countryData.ssn && !/^[0-9]{3}-[0-9]{2}-[0-9]{4}$/.test(countryData.ssn)) {
          errors.push('SSN must be in format XXX-XX-XXXX');
        }
        break;
        
      case 'India':
        if (!data.name) errors.push('Name is required');
        if (!data.age) errors.push('Age is required');
        if (!countryData.hospitalUidAadhaar) errors.push('Hospital UID/Aadhaar is required');
        break;
        
      case 'Japan':
        if (!data.name) errors.push('Name is required');
        if (!data.age) errors.push('Age is required');
        if (!countryData.hospitalPatientID) errors.push('Hospital Patient ID is required');
        break;
    }
  }
}