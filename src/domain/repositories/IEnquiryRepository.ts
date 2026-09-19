import { Types } from "mongoose";
import { EnquiryStatusType, Enquiry } from "../entities/enquiry";
import { ApiPaginationRequest } from "../../infrastructure/dtos/common.dts";
import { CreateEnquiryRequest, GetAllEnquiriesResponse } from "../../infrastructure/dtos/enquiry.dto";

export interface IEnquiryRepository {
  createEnquiry(enquiryData: CreateEnquiryRequest): Promise<Enquiry>;
  findAllEnquiries(params: ApiPaginationRequest): Promise<Omit<GetAllEnquiriesResponse, 'success' | 'message'>>;
  findEnquiryById(enquiryId: Types.ObjectId): Promise<Enquiry | null>;
  updateEnquiryStatus(enquiryId: Types.ObjectId, status: EnquiryStatusType): Promise<Enquiry | null>;
  updateEnquiryAccount(enquiryId: Types.ObjectId, account: string | null): Promise<Enquiry | null>;
  updateEnquiryCategory(enquiryId: Types.ObjectId, category: string | null): Promise<Enquiry | null>;
  deleteEnquiry(enquiryId: Types.ObjectId): Promise<boolean>;
  getTotalCount(): Promise<number>;
  getEnquiryStatusCounts(): Promise<Array<{ status: string; count: number }>>;
  getEnquiryStatusDistribution(period: 'weekly' | 'monthly'): Promise<Array<{ status: string; count: number }>>;
  getEnquiryStatsByPeriod(period: 'weekly' | 'monthly', status?: string, category?: string): Promise<Array<{ date: string; count: number }>>;
  getSummaryStats(): Promise<{ total: number; visitingPackage: number; inProgress: number; pending: number; completed: number }>;
  getEnquiriesByAccount(accountName: string): Promise<any[]>;
}
