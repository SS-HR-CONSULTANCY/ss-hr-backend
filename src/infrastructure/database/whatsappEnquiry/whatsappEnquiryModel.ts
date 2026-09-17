import mongoose, { Document, Schema } from 'mongoose';
import { EnquiryStatusType } from '../../../domain/entities/enquiry';

export interface IWhatsappEnquiry extends Document {
  name: string;
  contactNumber: string;
  subject: string;
  status: EnquiryStatusType;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappEnquirySchema = new Schema<IWhatsappEnquiry>({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['pending', 'contacted', 'under_processing', 'delivered'], default: 'pending' },
  date: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

export const WhatsappEnquiryModel = mongoose.model<IWhatsappEnquiry>('WhatsappEnquiry', whatsappEnquirySchema);
