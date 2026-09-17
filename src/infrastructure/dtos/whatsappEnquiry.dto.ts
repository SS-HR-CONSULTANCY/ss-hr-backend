import { EnquiryStatusType } from "../../domain/entities/enquiry";
import { WhatsappEnquiry } from "../../domain/entities/whatsappEnquiry";

export interface CreateWhatsappEnquiryRequest {
  name: string;
  contactNumber: string;
  subject: string;
  date?: Date | string;
  status?: EnquiryStatusType;
}

export interface UpdateWhatsappEnquiryRequest {
  name?: string;
  contactNumber?: string;
  subject?: string;
  date?: Date | string;
  status?: EnquiryStatusType;
}

export interface GetAllWhatsappEnquiriesResponse {
  success: boolean;
  message: string;
  data: WhatsappEnquiry[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}
