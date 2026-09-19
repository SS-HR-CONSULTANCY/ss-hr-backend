import { Types } from "mongoose";
import { WhatsappEnquiry } from "../entities/whatsappEnquiry";
import { EnquiryStatusType } from "../entities/enquiry";
import { ApiPaginationRequest } from "../../infrastructure/dtos/common.dts";
import { CreateWhatsappEnquiryRequest, GetAllWhatsappEnquiriesResponse, UpdateWhatsappEnquiryRequest } from "../../infrastructure/dtos/whatsappEnquiry.dto";

export interface IWhatsappEnquiryRepository {
  createEnquiry(enquiryData: CreateWhatsappEnquiryRequest): Promise<WhatsappEnquiry>;
  findAllEnquiries(params: ApiPaginationRequest): Promise<Omit<GetAllWhatsappEnquiriesResponse, 'success' | 'message'>>;
  findEnquiryById(enquiryId: Types.ObjectId): Promise<WhatsappEnquiry | null>;
  updateEnquiry(enquiryId: Types.ObjectId, enquiryData: UpdateWhatsappEnquiryRequest): Promise<WhatsappEnquiry | null>;
  updateEnquiryStatus(enquiryId: Types.ObjectId, status: EnquiryStatusType): Promise<WhatsappEnquiry | null>;
  updateEnquiryComment(enquiryId: Types.ObjectId, comment: string | null): Promise<WhatsappEnquiry | null>;
  updateEnquiryReminder(enquiryId: Types.ObjectId, reminder: Date | null): Promise<WhatsappEnquiry | null>;
  deleteEnquiry(enquiryId: Types.ObjectId): Promise<boolean>;
  getTotalCount(): Promise<number>;
}
