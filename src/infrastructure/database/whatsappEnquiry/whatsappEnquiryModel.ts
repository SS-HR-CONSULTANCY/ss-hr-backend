import mongoose, { Document, Schema } from 'mongoose';
import { EnquiryStatusType } from '../../../domain/entities/enquiry';

export interface IWhatsappEnquiry extends Document {
  name: string;
  contactNumber: string;
  subject: string;
  status: EnquiryStatusType;
  date: Date;
  account?: string;
  category?: string;
  comment?: string;
  reminder?: Date;
  statusHistory: Array<{ status: string; date: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappEnquirySchema = new Schema<IWhatsappEnquiry>({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['pending', 'contacted', 'need_follow_up', 'not_interested', 'processing_application', 'completed', 'rejected_application'], default: 'pending' },
  date: { type: Date, required: true, default: Date.now },
  account: { type: String, default: null },
  category: { type: String, default: null },
  comment: { type: String, default: null },
  reminder: { type: Date, default: null },
  statusHistory: { 
    type: [{ status: String, date: Date }], 
    default: function(this: any) {
      return [{ status: this.status || 'pending', date: new Date() }];
    }
  },
}, { timestamps: true });

export const WhatsappEnquiryModel = mongoose.model<IWhatsappEnquiry>('WhatsappEnquiry', whatsappEnquirySchema);
