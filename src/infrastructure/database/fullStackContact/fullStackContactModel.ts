import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFSSActivity {
  type: 'status' | 'comment' | 'schedule' | 'assignment';
  from?: string;
  to?: string;
  at: Date;
  by?: string;
}

export interface IFullStackContact extends Document {
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  service?: string;
  state?: string;
  city?: string;
  budget?: string;
  projectDescription?: string;
  status: 'Pending' | 'Contacted' | 'Need Follow Up' | 'In Discussion' | 'Quotation Sent' | 'Converted' | 'Completed' | 'Lost';
  comment?: string;
  scheduledDate?: Date;
  scheduledAt?: Date;
  assignedTo?: Types.ObjectId | any;
  activityLog: IFSSActivity[];
  createdAt: Date;
  updatedAt: Date;
}

const FSSActivitySchema = new Schema<IFSSActivity>(
  {
    type: { type: String, enum: ['status', 'comment', 'schedule', 'assignment'], required: true },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: String, default: 'Admin' },
  },
  { _id: false }
);

const FullStackContactSchema = new Schema<IFullStackContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    companyName: { type: String, trim: true, default: '' },
    service: { 
      type: String, 
      trim: true, 
      default: 'Web Development' 
    },
    state: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    budget: { type: String, trim: true, default: '' },
    projectDescription: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Contacted', 'Need Follow Up', 'In Discussion', 'Quotation Sent', 'Converted', 'Completed', 'Lost'],
      default: 'Pending',
    },
    comment: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date },
    scheduledAt: { type: Date, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'SystemUser', default: null, index: true },
    activityLog: { type: [FSSActivitySchema], default: [] },
  },
  { timestamps: true }
);

FullStackContactSchema.index({ phone: 1 });
FullStackContactSchema.index({ status: 1 });
FullStackContactSchema.index({ createdAt: -1 });

export const FullStackContactModel = mongoose.model<IFullStackContact>(
  "FullStackContact",
  FullStackContactSchema
);
