import mongoose, { Document, Schema } from "mongoose";

export interface IImportedCustomer extends Document {
  name: string;
  email: string;
  phone: string;
  state: string;
  designations: string[];
  cvUrl: string;
  linkedinUrl?: string;
  source: string;
  status: string;
  comment: string;
  scheduledDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportedCustomerSchema = new Schema<IImportedCustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    state: { type: String, trim: true },
    designations: { type: [String], default: [] },
    cvUrl: { type: String, trim: true },
    linkedinUrl: { type: String, trim: true },
    source: { type: String, default: 'ShareMyApps' },
    status: { 
      type: String, 
      enum: ['Pending', 'Contacted', 'Interested', 'Converted', 'Not Interested'], 
      default: 'Pending' 
    },
    comment: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date },
  },
  { timestamps: true }
);

export const ImportedCustomerModel = mongoose.model<IImportedCustomer>("ImportedCustomer", ImportedCustomerSchema);
