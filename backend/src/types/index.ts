export interface IPatient {
  name: string;
  age: number;
  country: 'UK' | 'US' | 'India' | 'Japan';
  countryData: {
    // UK fields
    nhsNumber?: string;
    address?: string;
    gpName?: string;
    nhsInsuranceNumber?: string;
    
    // US fields
    mrn?: string;
    ssn?: string;
    healthInsurancePolicyNumber?: string;
    primaryInsuranceProvider?: string;
    
    // India fields
    hospitalUidAadhaar?: string;
    insuranceMemberID?: string;
    insuranceCompanyName?: string;
    
    // Japan fields  
    hospitalPatientID?: string;
    nationalHealthInsuranceCardNumber?: string;
    prefectureCode?: string;
  };
  sourceFormId?: string;
  extractedAt: Date;
  googleFormUrl?: string;
  status: 'extracted' | 'verified' | 'duplicate';
}

export interface IFieldMapping {
  fieldName: string;
  googleFormSelector: string;
  dataAttribute?: string;
  inputType: 'text' | 'number' | 'select' | 'textarea';
  isRequired: boolean;
  validationPattern?: string;
  placeholder?: string;
}

export interface IFormFormat {
  country: 'UK' | 'US' | 'India' | 'Japan';
  formName: string;
  description?: string;
  googleFormUrl?: string;
  isActive: boolean;
  fieldMappings: IFieldMapping[];
  formTemplate: {
    title: string;
    description?: string;
    fields: Array<{
      label: string;
      type: string;
      required: boolean;
      options?: string[];
      dataAttribute: string;
      placeholder?: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IExtractionLog {
  googleFormUrl: string;
  formFormatId?: string;
  extractedData: Record<string, any>;
  patientId?: string;
  extractionStatus: 'success' | 'partial' | 'failed' | 'duplicate_found';
  duplicatePatients?: string[];
  extractedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  limit?: number;
  offset?: number;
}

// Database document types that include MongoDB _id field
export type PatientDocument = IPatient & { _id?: any };
export type FormFormatDocument = IFormFormat & { _id?: any };
export type ExtractionLogDocument = IExtractionLog & { _id?: any };

export interface DuplicateAnalysis {
  isDuplicate: boolean;
  duplicatePatients: PatientDocument[];
  suggestions: Array<{
    field: string;
    suggestedValue: string;
    confidence: number;
  }>;
  validationErrors: string[];
}

export interface MatchResult {
  exactMatches: PatientDocument[];
  partialMatches: Array<{
    patient: PatientDocument;
    matchScore: number;
  }>;
}