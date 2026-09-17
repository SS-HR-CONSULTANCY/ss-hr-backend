import { Types } from "mongoose";
import { EnquiryStatusType, Enquiry } from "../entities/enquiry";
import { ApiPaginationRequest } from "../../infrastructure/dtos/common.dts";
import { CreateEnquiryRequest, GetAllEnquiriesResponse } from "../../infrastructure/dtos/enquiry.dto";

export interface IEnquiryRepository {
  createEnquiry(enquiryData: CreateEnquiryRequest): Promise<Enquiry>;
  findAllEnquiries(params: ApiPaginationRequest): Promise<Omit<GetAllEnquiriesResponse, 'success' | 'message'>>;
  findEnquiryById(enquiryId: Types.ObjectId): Promise<Enquiry | null>;
  updateEnquiryStatus(enquiryId: Types.ObjectId, status: EnquiryStatusType): Promise<Enquiry | null>;
  deleteEnquiry(enquiryId: Types.ObjectId): Promise<boolean>;
  getTotalCount(): Promise<number>;
}
