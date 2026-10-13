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
  activityLog: IImportedCustomerActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export type ImportedCustomerActivityType = 'status' | 'comment' | 'schedule' | 'state';

export interface IImportedCustomerActivity {
  type: ImportedCustomerActivityType;
  from?: string;
  to?: string;
  at: Date;
}

const ActivitySchema = new Schema<IImportedCustomerActivity>(
  {
    type: { type: String, enum: ['status', 'comment', 'schedule', 'state'], required: true },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
      enum: ['Pending', 'Contacted', 'Need Follow Up', 'Not Interested', 'Processing Application', 'Completed', 'Rejected Application'], 
      default: 'Pending' 
    },
    comment: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date },
    activityLog: { type: [ActivitySchema], default: [] },
  },
  { timestamps: true }
);

export const ImportedCustomerModel = mongoose.model<IImportedCustomer>("ImportedCustomer", ImportedCustomerSchema);
