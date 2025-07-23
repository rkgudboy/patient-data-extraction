import mongoose, { Schema, Document } from 'mongoose';
import { IPatient } from '../types';

interface IPatientDocument extends IPatient, Document {}

const patientSchema = new Schema<IPatientDocument>({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  age: { 
    type: Number, 
    required: true,
    min: 1,
    max: 120
  },
  country: { 
    type: String, 
    enum: ['UK', 'US', 'India', 'Japan'], 
    required: true,
    index: true
  },
  countryData: {
    // UK fields
    nhsNumber: { 
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: 'NHS Number must be 10 digits'
      }
    },
    address: String,
    gpName: String,
    nhsInsuranceNumber: String,
    
    // US fields
    mrn: String,
    ssn: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/.test(v);
        },
        message: 'SSN must be in format XXX-XX-XXXX'
      }
    },
    healthInsurancePolicyNumber: String,
    primaryInsuranceProvider: String,
    
    // India fields
    hospitalUidAadhaar: String,
    insuranceMemberID: String,
    insuranceCompanyName: String,
    
    // Japan fields
    hospitalPatientID: String,
    nationalHealthInsuranceCardNumber: String,
    prefectureCode: String
  },
  sourceFormId: { 
    type: Schema.Types.ObjectId, 
    ref: 'FormFormat',
    index: true
  },
  extractedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  googleFormUrl: String,
  status: { 
    type: String, 
    enum: ['extracted', 'verified', 'duplicate'], 
    default: 'extracted',
    index: true
  }
}, {
  timestamps: true,
  collection: 'patients'
});

// Compound indexes for efficient querying
patientSchema.index({ name: 1, country: 1 });
patientSchema.index({ country: 1, extractedAt: -1 });
patientSchema.index({ 'countryData.nhsNumber': 1 }, { sparse: true });
patientSchema.index({ 'countryData.mrn': 1 }, { sparse: true });

// Text search index
patientSchema.index({ 
  name: 'text', 
  'countryData.address': 'text' 
});

export const Patient = mongoose.model<IPatientDocument>('Patient', patientSchema);