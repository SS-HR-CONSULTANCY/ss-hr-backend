import { ApiResponse } from "../../infrastructure/dtos/common.dts";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";

import { AdminFetchAllTestimonials } from "../../domain/repositories/ITestimonialRepository";
import { TestimonialRepositoryImpl } from "../../infrastructure/database/testimonial/testimonialRepositoryImpl";

export class UseGetTestimonialsUseCase {
    constructor(
        private testimonialRepositoryImpl: TestimonialRepositoryImpl,
    ) { }

    async execute(): Promise<ApiResponse<AdminFetchAllTestimonials>> {
        try {
            const result = await this.testimonialRepositoryImpl.findVisibleTestimonials({ page: 1, limit: 10 });
 
            return {
                success: true,
                message: "Reviews retrieved successfully",
                data: result.data ?? [],
            };
        } catch (error) {
            throw handleUseCaseError(error || "Failed to get reviews");
        }
    }
}