import { Types } from "mongoose";
import { ApiResponse } from "./common.dts";

// Create Testimonial DTOs
export interface CreateTestimonialRequest {
  clientName: string;
  designation: string;
  testimonial: string;
}

export interface CreateTestimonialResponse extends ApiResponse {
  testimonial?: {
    _id: Types.ObjectId;
    clientName: string;
    designation: string;
    testimonial: string;
  };
}

// Update Testimonial DTOs
export interface UpdateTestimonialRequest {
  _id: Types.ObjectId;
  clientName?: string;
  designation?: string;
  testimonial?: string;
  isVisible?: boolean;
}

export interface UpdateTestimonialResponse extends ApiResponse {
  testimonial?: {
    _id: Types.ObjectId;
    clientName: string;
    designation: string;
    testimonial: string;
    isVisible: boolean;
  };
}

// Get Testimonial DTOs
export interface GetTestimonialByIdRequest {
  testimonialId: Types.ObjectId;
}

export interface GetTestimonialByIdResponse extends ApiResponse {
  testimonial?: {
    _id: Types.ObjectId;
    clientName: string;
    designation: string;
    testimonial: string;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Delete Testimonial DTOs
export interface DeleteTestimonialRequest {
  testimonialId: Types.ObjectId;
}