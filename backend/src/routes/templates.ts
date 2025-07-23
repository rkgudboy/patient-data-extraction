import express from 'express';
import { ApiResponse } from '../types';

const router = express.Router();

// Country template definitions
const COUNTRY_TEMPLATES = {
  UK: {
    country: 'UK',
    countryName: 'United Kingdom',
    fields: [
      { 
        name: 'name', 
        label: 'Full Name', 
        type: 'text', 
        required: true,
        placeholder: 'Enter patient\'s full name',
        dataAttribute: 'data-patient-name'
      },
      { 
        name: 'age', 
        label: 'Age', 
        type: 'number', 
        required: true,
        placeholder: 'Age in years',
        dataAttribute: 'data-patient-age'
      },
      { 
        name: 'nhsNumber', 
        label: 'NHS Number', 
        type: 'text', 
        required: true,
        placeholder: '1234567890',
        pattern: '^[0-9]{10}$',
        dataAttribute: 'data-nhs-number'
      },
      { 
        name: 'address', 
        label: 'Address', 
        type: 'textarea', 
        required: true,
        placeholder: 'Full residential address',
        dataAttribute: 'data-patient-address'
      },
      { 
        name: 'gpName', 
        label: 'GP Name', 
        type: 'text', 
        required: true,
        placeholder: 'Dr. Smith',
        dataAttribute: 'data-gp-name'
      },
      { 
        name: 'nhsInsuranceNumber', 
        label: 'NHS Insurance Number', 
        type: 'text', 
        required: false,
        placeholder: 'Insurance number',
        dataAttribute: 'data-nhs-insurance'
      }
    ]
  },
  US: {
    country: 'US',
    countryName: 'United States',
    fields: [
      { 
        name: 'name', 
        label: 'Full Name', 
        type: 'text', 
        required: true,
        placeholder: 'Enter patient\'s full name',
        dataAttribute: 'data-patient-name'
      },
      { 
        name: 'age', 
        label: 'Age', 
        type: 'number', 
        required: true,
        placeholder: 'Age in years',
        dataAttribute: 'data-patient-age'
      },
      { 
        name: 'mrn', 
        label: 'Medical Record Number (MRN)', 
        type: 'text', 
        required: true,
        placeholder: 'MRN-123456',
        dataAttribute: 'data-mrn'
      },
      { 
        name: 'ssn', 
        label: 'Social Security Number', 
        type: 'text', 
        required: false,
        placeholder: '123-45-6789',
        pattern: '^[0-9]{3}-[0-9]{2}-[0-9]{4}$',
        dataAttribute: 'data-ssn'
      },
      { 
        name: 'healthInsurancePolicyNumber', 
        label: 'Health Insurance Policy Number', 
        type: 'text', 
        required: true,
        placeholder: 'Policy number',
        dataAttribute: 'data-insurance-policy'
      },
      { 
        name: 'primaryInsuranceProvider', 
        label: 'Primary Insurance Provider', 
        type: 'text', 
        required: true,
        placeholder: 'Blue Cross Blue Shield',
        dataAttribute: 'data-insurance-provider'
      }
    ]
  },
  India: {
    country: 'India',
    countryName: 'India',
    fields: [
      { 
        name: 'name', 
        label: 'Full Name', 
        type: 'text', 
        required: true,
        placeholder: 'Enter patient\'s full name',
        dataAttribute: 'data-patient-name'
      },
      { 
        name: 'age', 
        label: 'Age', 
        type: 'number', 
        required: true,
        placeholder: 'Age in years',
        dataAttribute: 'data-patient-age'
      },
      { 
        name: 'hospitalUidAadhaar', 
        label: 'Hospital UID / Aadhaar Number', 
        type: 'text', 
        required: true,
        placeholder: '1234 5678 9012',
        dataAttribute: 'data-hospital-uid'
      },
      { 
        name: 'address', 
        label: 'Address', 
        type: 'textarea', 
        required: true,
        placeholder: 'Full residential address',
        dataAttribute: 'data-patient-address'
      },
      { 
        name: 'insuranceMemberID', 
        label: 'Insurance Member ID', 
        type: 'text', 
        required: true,
        placeholder: 'Member ID',
        dataAttribute: 'data-insurance-member-id'
      },
      { 
        name: 'insuranceCompanyName', 
        label: 'Insurance Company Name', 
        type: 'text', 
        required: true,
        placeholder: 'New India Assurance',
        dataAttribute: 'data-insurance-company'
      }
    ]
  },
  Japan: {
    country: 'Japan',
    countryName: 'Japan',
    fields: [
      { 
        name: 'name', 
        label: 'Full Name', 
        type: 'text', 
        required: true,
        placeholder: 'Enter patient\'s full name',
        dataAttribute: 'data-patient-name'
      },
      { 
        name: 'age', 
        label: 'Age', 
        type: 'number', 
        required: true,
        placeholder: 'Age in years',
        dataAttribute: 'data-patient-age'
      },
      { 
        name: 'hospitalPatientID', 
        label: 'Hospital Patient ID', 
        type: 'text', 
        required: true,
        placeholder: 'Patient ID',
        dataAttribute: 'data-hospital-patient-id'
      },
      { 
        name: 'nationalHealthInsuranceCardNumber', 
        label: 'National Health Insurance Card Number', 
        type: 'text', 
        required: true,
        placeholder: 'Insurance card number',
        dataAttribute: 'data-health-insurance-card'
      },
      { 
        name: 'address', 
        label: 'Address', 
        type: 'textarea', 
        required: true,
        placeholder: 'Registered address',
        dataAttribute: 'data-patient-address'
      },
      { 
        name: 'prefectureCode', 
        label: 'Prefecture Code', 
        type: 'text', 
        required: true,
        placeholder: 'Prefecture code',
        dataAttribute: 'data-prefecture-code'
      }
    ]
  }
};

// GET /api/templates/countries - Get available country templates
router.get('/countries', async (req, res) => {
  try {
    const countries = Object.values(COUNTRY_TEMPLATES);

    const response: ApiResponse = {
      success: true,
      data: countries,
      total: countries.length
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching country templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch country templates'
    });
  }
});

// GET /api/templates/countries/:country - Get specific country template
router.get('/countries/:country', async (req, res) => {
  try {
    const { country } = req.params;
    const template = (COUNTRY_TEMPLATES as any)[country];

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Country template not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: template
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching country template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch country template'
    });
  }
});

// POST /api/templates/generate - Generate Google Form template
router.post('/generate', async (req, res) => {
  try {
    const { country, formName, customFields = [] } = req.body;

    if (!country || !formName) {
      return res.status(400).json({
        success: false,
        error: 'Country and formName are required'
      });
    }

    const template = (COUNTRY_TEMPLATES as any)[country];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Country template not found'
      });
    }

    // Merge template fields with custom fields
    const allFields = [...template.fields, ...customFields];

    // Generate HTML template
    const formTemplate = generateHTMLTemplate(country, formName, allFields);

    // Generate field mappings for the extension
    const fieldMappings = allFields.map(field => ({
      fieldName: field.name,
      googleFormSelector: `[${field.dataAttribute}]`,
      dataAttribute: field.dataAttribute,
      inputType: field.type,
      isRequired: field.required,
      validationPattern: field.pattern || undefined,
      placeholder: field.placeholder
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        formTemplate,
        fieldMappings,
        country,
        formName,
        fields: allFields
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error generating form template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate form template'
    });
  }
});

// Helper function to generate HTML template
function generateHTMLTemplate(country: string, formName: string, fields: any[]): string {
  const fieldHTML = fields.map(field => {
    const inputType = field.type === 'textarea' ? 'textarea' : 'input';
    const typeAttr = field.type !== 'textarea' ? `type="${field.type}"` : '';
    const requiredAttr = field.required ? 'required' : '';
    const patternAttr = field.pattern ? `pattern="${field.pattern}"` : '';
    const placeholderAttr = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    const validationAttr = field.required ? 'data-validation="required"' : '';

    return `
    <div data-field-container="${field.name}">
      <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
      <${inputType}
        id="${field.name}"
        name="${field.name}"
        ${field.dataAttribute}
        data-field-type="${field.type}"
        ${validationAttr}
        ${typeAttr}
        ${requiredAttr}
        ${patternAttr}
        ${placeholderAttr}
        aria-label="${field.label}"
      ${inputType === 'textarea' ? '/>' : '/>'}
    </div>`;
  }).join('\n');

  return `
<div data-form-country="${country}" data-form-type="patient-registration">
  <h1>${formName}</h1>
  <p>Please fill in all required fields marked with *</p>
  
  ${fieldHTML}
  
  <button type="submit" data-submit-button="true">Submit</button>
</div>`;
}

// POST /api/templates/validate - Validate generated template
router.post('/validate', async (req, res) => {
  try {
    const { formTemplate, country } = req.body;

    if (!formTemplate || !country) {
      return res.status(400).json({
        success: false,
        error: 'formTemplate and country are required'
      });
    }

    const template = (COUNTRY_TEMPLATES as any)[country];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Country template not found'
      });
    }

    // Basic validation checks
    const validationResults = {
      hasCountryAttribute: formTemplate.includes(`data-form-country="${country}"`),
      hasRequiredFields: template.fields
        .filter((f: any) => f.required)
        .every((field: any) => formTemplate.includes(field.dataAttribute)),
      hasSubmitButton: formTemplate.includes('data-submit-button="true"'),
      missingRequiredFields: template.fields
        .filter((f: any) => f.required && !formTemplate.includes(f.dataAttribute))
        .map((f: any) => f.name)
    };

    const isValid = validationResults.hasCountryAttribute && 
                   validationResults.hasRequiredFields && 
                   validationResults.hasSubmitButton;

    const response: ApiResponse = {
      success: true,
      data: {
        isValid,
        validationResults,
        suggestions: isValid ? [] : [
          !validationResults.hasCountryAttribute && 'Add data-form-country attribute',
          !validationResults.hasRequiredFields && 'Add missing required fields',
          !validationResults.hasSubmitButton && 'Add submit button with data-submit-button attribute'
        ].filter(Boolean)
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error validating template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate template'
    });
  }
});

export default router;