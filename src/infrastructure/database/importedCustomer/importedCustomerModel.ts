import mongoose, { Document, Schema, Types } from "mongoose";

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
  isNewLead?: boolean;
  comment: string;
  scheduledDate?: Date;
  scheduledAt?: Date;
  assignedTo?: Types.ObjectId | any;
  activityLog: IImportedCustomerActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export type ImportedCustomerActivityType = 'status' | 'comment' | 'schedule' | 'state' | 'assignment';

export interface IImportedCustomerActivity {
  type: ImportedCustomerActivityType;
  from?: string;
  to?: string;
  at: Date;
  by?: Types.ObjectId;
}

const ActivitySchema = new Schema<IImportedCustomerActivity>(
  {
    type: { type: String, enum: ['status', 'comment', 'schedule', 'state', 'assignment'], required: true },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'SystemUser' },
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
      enum: ['Pending', 'Contacted', 'Re-contacted', 'Recontacted', 'Need Follow Up', 'Not Interested', 'Processing Application', 'Rejected Application', 'Completed'], 
      default: 'Pending' 
    },
    isNewLead: { type: Boolean, default: true },
    comment: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date },
    scheduledAt: { type: Date, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'SystemUser', default: null, index: true },
    activityLog: { type: [ActivitySchema], default: [] },
  },
  { timestamps: true }
);

export const ImportedCustomerModel = mongoose.model<IImportedCustomer>("ImportedCustomer", ImportedCustomerSchema);
