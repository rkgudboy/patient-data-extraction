import mongoose, { Schema, Document } from 'mongoose';
import { IFormFormat, IFieldMapping } from '../types';

interface IFormFormatDocument extends IFormFormat, Document {}

const fieldMappingSchema = new Schema<IFieldMapping>({
  fieldName: { 
    type: String, 
    required: true 
  },
  googleFormSelector: { 
    type: String, 
    required: true 
  },
  dataAttribute: String,
  inputType: { 
    type: String, 
    enum: ['text', 'number', 'select', 'textarea'], 
    required: true 
  },
  isRequired: { 
    type: Boolean, 
    default: false 
  },
  validationPattern: String,
  placeholder: String
}, { _id: false });

const formFormatSchema = new Schema<IFormFormatDocument>({
  country: { 
    type: String, 
    enum: ['UK', 'US', 'India', 'Japan'], 
    required: true,
    index: true
  },
  formName: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  googleFormUrl: String,
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  fieldMappings: [fieldMappingSchema],
  formTemplate: {
    title: { type: String, required: true },
    description: String,
    fields: [{
      label: { type: String, required: true },
      type: { type: String, required: true },
      required: { type: Boolean, default: false },
      options: [String],
      dataAttribute: { type: String, required: true },
      placeholder: String
    }]
  }
}, {
  timestamps: true,
  collection: 'form_formats'
});

// Compound indexes
formFormatSchema.index({ country: 1, isActive: 1 });
formFormatSchema.index({ formName: 1, country: 1 }, { unique: true });

export const FormFormat = mongoose.model<IFormFormatDocument>('FormFormat', formFormatSchema);