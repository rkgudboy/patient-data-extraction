import express from 'express';
import { FormFormat } from '../models/FormFormat';
import { ApiResponse, IFormFormat } from '../types';

const router = express.Router();

// GET /api/form-formats - Get all form formats
router.get('/', async (req, res) => {
  try {
    const { country, active, url } = req.query;

    const query: any = {};
    if (country) query.country = country;
    if (active !== undefined) query.isActive = active === 'true';
    if (url) query.googleFormUrl = new RegExp(url as string, 'i');

    const formFormats = await FormFormat.find(query)
      .sort({ country: 1, formName: 1 })
      .lean();

    const response: ApiResponse<IFormFormat[]> = {
      success: true,
      data: formFormats,
      total: formFormats.length
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching form formats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch form formats'
    });
  }
});

// POST /api/form-formats - Create new form format
router.post('/', async (req, res) => {
  try {
    const formatData: IFormFormat = req.body;

    // Validate required fields
    if (!formatData.country || !formatData.formName || !formatData.fieldMappings || !formatData.formTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Country, formName, fieldMappings, and formTemplate are required'
      });
    }

    // Check for duplicate form name in same country
    const existingFormat = await FormFormat.findOne({
      country: formatData.country,
      formName: formatData.formName
    });

    if (existingFormat) {
      return res.status(409).json({
        success: false,
        error: 'Form format with this name already exists for this country'
      });
    }

    const formFormat = new FormFormat(formatData);
    await formFormat.save();

    const response: ApiResponse<IFormFormat> = {
      success: true,
      data: formFormat.toObject()
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating form format:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create form format'
    });
  }
});

// GET /api/form-formats/:id - Get specific form format
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const formFormat = await FormFormat.findById(id).lean();

    if (!formFormat) {
      return res.status(404).json({
        success: false,
        error: 'Form format not found'
      });
    }

    const response: ApiResponse<IFormFormat> = {
      success: true,
      data: formFormat
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching form format:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch form format'
    });
  }
});

// PUT /api/form-formats/:id - Update form format
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const formFormat = await FormFormat.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!formFormat) {
      return res.status(404).json({
        success: false,
        error: 'Form format not found'
      });
    }

    const response: ApiResponse<IFormFormat> = {
      success: true,
      data: formFormat.toObject()
    };

    return res.json(response);
  } catch (error) {
    console.error('Error updating form format:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update form format'
    });
  }
});

// DELETE /api/form-formats/:id - Delete form format
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const formFormat = await FormFormat.findByIdAndDelete(id);

    if (!formFormat) {
      return res.status(404).json({
        success: false,
        error: 'Form format not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Form format deleted successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error deleting form format:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete form format'
    });
  }
});

// POST /api/form-formats/:id/toggle - Toggle form format active status
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const formFormat = await FormFormat.findById(id);

    if (!formFormat) {
      return res.status(404).json({
        success: false,
        error: 'Form format not found'
      });
    }

    formFormat.isActive = !formFormat.isActive;
    formFormat.updatedAt = new Date();
    await formFormat.save();

    const response: ApiResponse<IFormFormat> = {
      success: true,
      data: formFormat.toObject()
    };

    return res.json(response);
  } catch (error) {
    console.error('Error toggling form format:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle form format'
    });
  }
});

// GET /api/form-formats/country/:country - Get form formats by country
router.get('/country/:country', async (req, res) => {
  try {
    const { country } = req.params;
    const { active = 'true' } = req.query;

    const query: any = { country };
    if (active !== undefined) query.isActive = active === 'true';

    const formFormats = await FormFormat.find(query)
      .sort({ formName: 1 })
      .lean();

    const response: ApiResponse<IFormFormat[]> = {
      success: true,
      data: formFormats,
      total: formFormats.length
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching form formats by country:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch form formats by country'
    });
  }
});

export default router;