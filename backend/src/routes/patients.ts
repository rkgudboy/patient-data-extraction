import express from 'express';
import { Patient } from '../models/Patient';
import { ExtractionLog } from '../models/ExtractionLog';
import { ApiResponse, IPatient } from '../types';

const router = express.Router();

// GET /api/patients - Get all patients with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      country, 
      limit = '20', 
      offset = '0', 
      search, 
      status 
    } = req.query;

    const query: any = {};
    
    if (country) query.country = country;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search as string, 'i') },
        { 'countryData.nhsNumber': new RegExp(search as string, 'i') },
        { 'countryData.mrn': new RegExp(search as string, 'i') }
      ];
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .sort({ extractedAt: -1 })
        .limit(limitNum)
        .skip(offsetNum)
        .populate('sourceFormId', 'formName country')
        .lean(),
      Patient.countDocuments(query)
    ]);

    const response: ApiResponse<IPatient[]> = {
      success: true,
      data: patients,
      total,
      limit: limitNum,
      offset: offsetNum
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch patients'
    });
  }
});

// POST /api/patients - Create new patient
router.post('/', async (req, res) => {
  try {
    const patientData: IPatient = req.body;
    
    // Validate required fields
    if (!patientData.name || !patientData.age || !patientData.country) {
      return res.status(400).json({
        success: false,
        error: 'Name, age, and country are required'
      });
    }

    const patient = new Patient(patientData);
    await patient.save();

    // Log the creation
    if (patientData.googleFormUrl) {
      await ExtractionLog.create({
        googleFormUrl: patientData.googleFormUrl,
        formFormatId: patientData.sourceFormId,
        extractedData: patientData,
        patientId: (patient as any)._id,
        extractionStatus: 'success'
      });
    }

    const response: ApiResponse<IPatient> = {
      success: true,
      data: patient.toObject()
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating patient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create patient'
    });
  }
});

// GET /api/patients/:id - Get specific patient
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const patient = await Patient.findById(id)
      .populate('sourceFormId', 'formName country description')
      .lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    const response: ApiResponse<IPatient> = {
      success: true,
      data: patient
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch patient'
    });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const patient = await Patient.findByIdAndUpdate(
      id, 
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('sourceFormId', 'formName country');

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    const response: ApiResponse<IPatient> = {
      success: true,
      data: patient.toObject()
    };

    return res.json(response);
  } catch (error) {
    console.error('Error updating patient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update patient'
    });
  }
});

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByIdAndDelete(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Also delete related extraction logs
    await ExtractionLog.deleteMany({ patientId: id });

    const response: ApiResponse = {
      success: true,
      message: 'Patient deleted successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error deleting patient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete patient'
    });
  }
});

// GET /api/patients/:id/history - Get patient extraction history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const history = await ExtractionLog.find({ patientId: id })
      .sort({ extractedAt: -1 })
      .populate('formFormatId', 'formName country')
      .lean();

    const response: ApiResponse = {
      success: true,
      data: history
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch patient history'
    });
  }
});

export default router;