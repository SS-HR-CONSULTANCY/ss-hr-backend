import mongoose, { Document, Schema } from "mongoose";

export interface IImportedCustomer extends Document {
  name: string;
  email: string;
  phone: string;
  state: string;
  designations: string[];
  cvUrl: string;
  source: string;
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
    source: { type: String, default: 'ShareMyApps' },
  },
  { timestamps: true }
);

export const ImportedCustomerModel = mongoose.model<IImportedCustomer>("ImportedCustomer", ImportedCustomerSchema);
