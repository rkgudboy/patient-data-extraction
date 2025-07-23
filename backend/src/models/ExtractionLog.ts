import mongoose, { Schema, Document } from 'mongoose';
import { IExtractionLog } from '../types';

interface IExtractionLogDocument extends IExtractionLog, Document {}

const extractionLogSchema = new Schema<IExtractionLogDocument>({
  googleFormUrl: { 
    type: String, 
    required: true,
    index: true
  },
  formFormatId: { 
    type: Schema.Types.ObjectId, 
    ref: 'FormFormat',
    index: true
  },
  extractedData: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient',
    index: true
  },
  extractionStatus: { 
    type: String, 
    enum: ['success', 'partial', 'failed', 'duplicate_found'], 
    required: true,
    index: true
  },
  duplicatePatients: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Patient' 
  }],
  extractedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'extraction_logs'
});

// Compound indexes for analytics
extractionLogSchema.index({ extractionStatus: 1, extractedAt: -1 });
extractionLogSchema.index({ googleFormUrl: 1, extractedAt: -1 });

export const ExtractionLog = mongoose.model<IExtractionLogDocument>('ExtractionLog', extractionLogSchema);