import { Types } from "mongoose";
import { ApiResponse } from "./common.dts";
import { EnquiryStatusType } from "../../domain/entities/enquiry";

export interface CreateEnquiryRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
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
  data: {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    status: EnquiryStatusType;
    createdAt: string;
    updatedAt: string;
  }[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}
