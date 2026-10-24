import {Types} from "mongoose"
import { Testimonial } from "../entities/testimonial"
import {ApiPaginationRequest,ApiResponse} from "../../infrastructure/dtos/common.dts"

export type CreateTestimonial = Partial<Pick<Testimonial, "clientName" | "clientPhoto" | "designation" | "testimonial" | "rating" | "reviewDate">>;
export type AdminFetchAllTestimonials = Array<Pick<Testimonial, "_id" | "clientName" | "clientPhoto" | "designation" | "testimonial" | "isVisible" | "createdAt" | "updatedAt" | "rating" | "reviewDate" | "googleReviewId">>;

export type UpsertGoogleReviewData = {
  clientName: string;
  clientPhoto?: string;
  designation?: string;
  testimonial: string;
  rating: number;
  reviewDate: Date;
  googleReviewId: string;
};

export interface ITestimonialRepository {

    createTestimonial(testimonial:CreateTestimonial):Promise<Testimonial>;

    findAllTestimonials({page,limit}: ApiPaginationRequest):Promise<ApiResponse<AdminFetchAllTestimonials>>;

    findTestimonialById(testimonialId:Types.ObjectId):Promise<Testimonial|null>;

    updateTestimonial(testimonial:Testimonial):Promise<Testimonial | null>;

    deleteTestimonial(testimonialid:Types.ObjectId):Promise<boolean>;

    getTotalCount():Promise<number>;

    findVisibleTestimonials({page,limit}:ApiPaginationRequest):Promise<ApiResponse<AdminFetchAllTestimonials>>;

    upsertGoogleReview(reviewData: UpsertGoogleReviewData): Promise<{ isNew: boolean }>;

}