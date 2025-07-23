export interface Patient {
  _id?: string;
  name: string;
  age: number;
  country: 'UK' | 'US' | 'India' | 'Japan';
  countryData: {
    nhsNumber?: string;
    address?: string;
    gpName?: string;
    nhsInsuranceNumber?: string;
    mrn?: string;
    ssn?: string;
    healthInsurancePolicyNumber?: string;
    primaryInsuranceProvider?: string;
    hospitalUidAadhaar?: string;
    insuranceMemberID?: string;
    insuranceCompanyName?: string;
    hospitalPatientID?: string;
    nationalHealthInsuranceCardNumber?: string;
    prefectureCode?: string;
  };
  sourceFormId?: string;
  extractedAt: Date;
  googleFormUrl?: string;
  status: 'extracted' | 'verified' | 'duplicate';
}

export interface FormFormat {
  _id?: string;
  country: 'UK' | 'US' | 'India' | 'Japan';
  formName: string;
  description?: string;
  googleFormUrl?: string;
  isActive: boolean;
  fieldMappings: FieldMapping[];
  formTemplate: FormTemplate;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldMapping {
  fieldName: string;
  googleFormSelector: string;
  dataAttribute?: string;
  inputType: 'text' | 'number' | 'select' | 'textarea';
  isRequired: boolean;
  validationPattern?: string;
  placeholder?: string;
}

export interface FormTemplate {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormField {
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  dataAttribute: string;
  placeholder?: string;
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

export interface DuplicateAnalysis {
  isDuplicate: boolean;
  duplicatePatients: Patient[];
  suggestions: Array<{
    field: string;
    suggestedValue: string;
    confidence: number;
  }>;
  validationErrors: string[];
}

export interface CountryTemplate {
  country: string;
  countryName: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    pattern?: string;
    dataAttribute: string;
  }>;
}

export interface ExtractedData {
  [key: string]: any;
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  formFormat?: FormFormat;
  duplicateAnalysis?: DuplicateAnalysis;
  error?: string;
}