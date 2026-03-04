import {Types} from "mongoose"
import { Testimonial } from "../entities/testimonial"
import {ApiPaginationRequest,ApiResponse} from "../../infrastructure/dtos/common.dts"

export type CreateTestimonial = Partial<Pick<Testimonial,"clientName" | "designation" | "testimonial"> >
export type AdminFetchAllTestimonials = Array<Pick<Testimonial,"_id"|"clientName"|"designation"|"testimonial"|"isVisible"|"createdAt"|"updatedAt">>

export interface ITestimonialRepository {

    createTestimonial(testimonial:CreateTestimonial):Promise<Testimonial>;

    findAllTestimonials({page,limit}: ApiPaginationRequest):Promise<ApiResponse<AdminFetchAllTestimonials>>;

    findTestimonialById(testimonialId:Types.ObjectId):Promise<Testimonial|null>;

    updateTestimonial(testimonial:Testimonial):Promise<Testimonial | null>;

    deleteTestimonial(testimonialid:Types.ObjectId):Promise<boolean>;

    getTotalCount():Promise<number>;

    findVisibleTestimonials({page,limit}:ApiPaginationRequest):Promise<ApiResponse<AdminFetchAllTestimonials>>

}