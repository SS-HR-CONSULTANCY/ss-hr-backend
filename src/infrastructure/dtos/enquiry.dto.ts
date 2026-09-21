import { Types } from "mongoose";
import { ApiResponse } from "./common.dts";
import { EnquiryStatusType, Enquiry } from "../../domain/entities/enquiry";

export interface CreateEnquiryRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  category?: string;
}

export interface CreateEnquiryResponse extends ApiResponse {
  enquiry?: {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    status: EnquiryStatusType;
  };
}

export interface UpdateEnquiryStatusRequest {
  enquiryId: Types.ObjectId;
  status: EnquiryStatusType;
}

export interface GetAllEnquiriesResponse {
  success: boolean;
  message: string;
  data: Enquiry[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}
