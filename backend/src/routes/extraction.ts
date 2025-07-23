import express from 'express';
import { Patient } from '../models/Patient';
import { FormFormat } from '../models/FormFormat';
import { ExtractionLog } from '../models/ExtractionLog';
import { DuplicateChecker } from '../utils/duplicateChecker';
import { ApiResponse, IPatient, DuplicateAnalysis, MatchResult } from '../types';

const router = express.Router();

// POST /api/extract/analyze - Analyze form data for duplicates and validation
router.post('/analyze', async (req, res) => {
  try {
    const { googleFormUrl, extractedData, country } = req.body;

    if (!extractedData || !country) {
      return res.status(400).json({
        success: false,
        error: 'extractedData and country are required'
      });
    }

    // Create patient object for analysis
    const patientData: Partial<IPatient> = {
      ...extractedData,
      country
    };

    // Analyze for duplicates and validation
    const analysis = await DuplicateChecker.analyzeDuplicates(patientData);

    // Log the analysis
    await ExtractionLog.create({
      googleFormUrl: googleFormUrl || 'unknown',
      extractedData,
      extractionStatus: analysis.isDuplicate ? 'duplicate_found' : 
                       analysis.validationErrors.length > 0 ? 'partial' : 'success',
      duplicatePatients: analysis.duplicatePatients.map(p => p._id).filter(id => id)
    });

    const response: ApiResponse<DuplicateAnalysis> = {
      success: true,
      data: analysis
    };

    return res.json(response);
  } catch (error) {
    console.error('Error analyzing extraction data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze extraction data'
    });
  }
});

// POST /api/extract/save - Save extracted data as new patient
router.post('/save', async (req, res) => {
  try {
    const { extractedData, formFormatId, googleFormUrl } = req.body;

    if (!extractedData) {
      return res.status(400).json({
        success: false,
        error: 'extractedData is required'
      });
    }

    // Validate form format if provided
    let formFormat = null;
    if (formFormatId) {
      formFormat = await FormFormat.findById(formFormatId);
      if (!formFormat) {
        return res.status(404).json({
          success: false,
          error: 'Form format not found'
        });
      }
    }

    // Create patient record
    const patientData: IPatient = {
      ...extractedData,
      sourceFormId: formFormatId,
      googleFormUrl,
      extractedAt: new Date(),
      status: 'extracted'
    };

    const patient = new Patient(patientData);
    await patient.save();

    // Log successful extraction
    await ExtractionLog.create({
      googleFormUrl: googleFormUrl || 'unknown',
      formFormatId,
      extractedData,
      patientId: (patient as any)._id,
      extractionStatus: 'success'
    });

    const response: ApiResponse<IPatient> = {
      success: true,
      data: patient.toObject()
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error saving extracted data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save extracted data'
    });
  }
});

// POST /api/extract/match - Find potential matches for extracted data
router.post('/match', async (req, res) => {
  try {
    const searchData: Partial<IPatient> = req.body;

    if (!searchData.name && !searchData.countryData) {
      return res.status(400).json({
        success: false,
        error: 'At least name or country-specific data is required for matching'
      });
    }

    const matchResult = await DuplicateChecker.findMatches(searchData);

    const response: ApiResponse<MatchResult> = {
      success: true,
      data: matchResult
    };

    return res.json(response);
  } catch (error) {
    console.error('Error finding matches:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find matches'
    });
  }
});

// POST /api/extract/validate - Validate extracted data against form format
router.post('/validate', async (req, res) => {
  try {
    const { extractedData, formFormatId } = req.body;

    if (!extractedData || !formFormatId) {
      return res.status(400).json({
        success: false,
        error: 'extractedData and formFormatId are required'
      });
    }

    const formFormat = await FormFormat.findById(formFormatId);
    if (!formFormat) {
      return res.status(404).json({
        success: false,
        error: 'Form format not found'
      });
    }

    const validationErrors: string[] = [];
    const missingFields: string[] = [];

    // Validate against field mappings
    for (const mapping of formFormat.fieldMappings) {
      const value = extractedData[mapping.fieldName];
      
      if (mapping.isRequired && (!value || value.toString().trim() === '')) {
        missingFields.push(mapping.fieldName);
        validationErrors.push(`${mapping.fieldName} is required`);
      }

      if (value && mapping.validationPattern) {
        const regex = new RegExp(mapping.validationPattern);
        if (!regex.test(value.toString())) {
          validationErrors.push(`${mapping.fieldName} format is invalid`);
        }
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        isValid: validationErrors.length === 0,
        validationErrors,
        missingFields,
        formFormat: {
          country: formFormat.country,
          formName: formFormat.formName
        }
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error validating data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate data'
    });
  }
});

// GET /api/extract/logs - Get extraction logs with filtering
router.get('/logs', async (req, res) => {
  try {
    const { 
      status, 
      limit = '50', 
      offset = '0', 
      startDate, 
      endDate 
    } = req.query;

    const query: any = {};
    if (status) query.extractionStatus = status;
    if (startDate || endDate) {
      query.extractedAt = {};
      if (startDate) query.extractedAt.$gte = new Date(startDate as string);
      if (endDate) query.extractedAt.$lte = new Date(endDate as string);
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    const [logs, total] = await Promise.all([
      ExtractionLog.find(query)
        .sort({ extractedAt: -1 })
        .limit(limitNum)
        .skip(offsetNum)
        .populate('formFormatId', 'formName country')
        .populate('patientId', 'name age country')
        .populate('duplicatePatients', 'name age country')
        .lean(),
      ExtractionLog.countDocuments(query)
    ]);

    const response: ApiResponse = {
      success: true,
      data: logs,
      total,
      limit: limitNum,
      offset: offsetNum
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching extraction logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch extraction logs'
    });
  }
});

// GET /api/extract/stats - Get extraction statistics
router.get('/stats', async (req, res) => {
  try {
    const { country, startDate, endDate } = req.query;

    const matchQuery: any = {};
    if (country) matchQuery.country = country;
    if (startDate || endDate) {
      matchQuery.extractedAt = {};
      if (startDate) matchQuery.extractedAt.$gte = new Date(startDate as string);
      if (endDate) matchQuery.extractedAt.$lte = new Date(endDate as string);
    }

    const [patientStats, extractionStats] = await Promise.all([
      Patient.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$country',
            total: { $sum: 1 },
            verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
            duplicates: { $sum: { $cond: [{ $eq: ['$status', 'duplicate'] }, 1, 0] } }
          }
        }
      ]),
      ExtractionLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$extractionStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        patientsByCountry: patientStats,
        extractionsByStatus: extractionStats,
        totalPatients: patientStats.reduce((sum, stat) => sum + stat.total, 0),
        totalExtractions: extractionStats.reduce((sum, stat) => sum + stat.count, 0)
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching extraction stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch extraction stats'
    });
  }
});

export default router;