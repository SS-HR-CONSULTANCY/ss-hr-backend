import mongoose, { Document, Schema } from 'mongoose';
import { EnquiryStatusType } from '../../../domain/entities/enquiry';

export interface IEnquiry extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: EnquiryStatusType;
  account?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: "" },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'contacted', 'need_follow_up', 'not_interested', 'processing_application', 'completed', 'rejected_application'], default: 'pending' },
  account: { type: String, default: null },
}, { timestamps: true });

export const EnquiryModel = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
