import {
  CreateTestimonialRequest,
  CreateTestimonialResponse,
  UpdateTestimonialRequest,
  UpdateTestimonialResponse,
  DeleteTestimonialRequest,
  GetTestimonialByIdRequest,
  GetTestimonialByIdResponse,
} from "../../infrastructure/dtos/testimonial.dto";
import { ApiResponse } from "../../infrastructure/dtos/common.dts";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { TestimonialRepositoryImpl } from "../../infrastructure/database/testimonial/testimonialRepositoryImpl";
import { AdminFetchAllTestimonials } from "../../domain/repositories/ITestimonialRepository";
import { OutscraperService } from "../../infrastructure/services/outscraperService";


export class CreateTestimonialUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
  ) { }

  async execute(data: CreateTestimonialRequest): Promise<CreateTestimonialResponse> {
    try {
      const { clientName, clientPhoto, designation, testimonial, rating, reviewDate } = data;

      const createdTestimonial = await this.testimonialRepository.createTestimonial({
        clientName,
        clientPhoto: clientPhoto || "",
        designation: designation || "Customer",
        testimonial,
        rating: typeof rating === "number" ? rating : 5,
        reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
      });

      if(!createdTestimonial) throw new Error("Testimonial adding failed");


      return {
        success: true,
        message: "Review created successfully",
        testimonial: {
          _id: createdTestimonial._id,
          clientName: createdTestimonial.clientName,
          clientPhoto: createdTestimonial.clientPhoto,
          designation: createdTestimonial.designation,
          testimonial: createdTestimonial.testimonial,
          rating: createdTestimonial.rating,
          reviewDate: createdTestimonial.reviewDate,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to create testimonial");
    }
  }
}

export class UpdateTestimonialUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
  ) {}

  async execute(data: UpdateTestimonialRequest): Promise<UpdateTestimonialResponse> {
    try {
      const { _id, clientName, clientPhoto, designation, isVisible, testimonial, rating, reviewDate } = data;

      const existingTestimonial = await this.testimonialRepository.findTestimonialById(_id);
      if (!existingTestimonial) throw new Error("Testimonial not found");

      existingTestimonial.clientName = clientName || existingTestimonial.clientName;
      if (clientPhoto !== undefined) existingTestimonial.clientPhoto = clientPhoto;
      existingTestimonial.designation = designation || existingTestimonial.designation;
      existingTestimonial.isVisible = isVisible ?? existingTestimonial.isVisible;
      existingTestimonial.testimonial = testimonial || existingTestimonial.testimonial;
      if (typeof rating === "number") existingTestimonial.rating = rating;
      if (reviewDate) existingTestimonial.reviewDate = new Date(reviewDate);

      const result = await this.testimonialRepository.updateTestimonial(existingTestimonial);
      if (!result) throw new Error("Failed to update testimonial");

      return {
        success: true,
        message: "Review updated successfully",
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update testimonial");
    }
  }
}


export class DeleteTestimonialUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
  ) { }

  async execute(data: DeleteTestimonialRequest): Promise<ApiResponse> {
    try {
      const { testimonialId } = data;

      const existingTestimonial = await this.testimonialRepository.findTestimonialById(testimonialId);
      if (!existingTestimonial) throw new Error("Testimonial not found");

      const deleted = await this.testimonialRepository.deleteTestimonial(testimonialId);
      if (!deleted) throw new Error("Failed to delete testimonial");

      return { success: true, message: "Review deleted successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to delete testimonial");
    }
  }
}

export class GetTestimonialByIdUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
  ) { }

  async execute(data: GetTestimonialByIdRequest): Promise<GetTestimonialByIdResponse> {
    try {
      const { testimonialId } = data;

      const testimonial = await this.testimonialRepository.findTestimonialById(testimonialId);
      if (!testimonial) throw new Error("Testimonial not found");

      return {
        success: true,
        message: "Review retrieved successfully",
        testimonial: {
          _id: testimonial._id,
          clientName: testimonial.clientName,
          clientPhoto: testimonial.clientPhoto,
          designation: testimonial.designation,
          testimonial: testimonial.testimonial,
          rating: testimonial.rating,
          reviewDate: testimonial.reviewDate,
          isVisible: testimonial.isVisible,
          createdAt: testimonial.createdAt,
          updatedAt: testimonial.updatedAt,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get testimonial");
    }
  }
}

export class GetAllTestimonialsUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
  ) { }

  async execute(data: { page: number; limit: number }): Promise<ApiResponse<AdminFetchAllTestimonials>> {
    try {
      const result = await this.testimonialRepository.findAllTestimonials(data);

      return {
        success: true,
        message: "Reviews retrieved successfully",
        data: result.data,
        currentPage: result.currentPage,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get testimonials");
    }
  }
}

export class GetTestimonialStatsUseCase {
  constructor(private testimonialRepository: TestimonialRepositoryImpl) { }

  async execute() {
    try {
      const totalTestimonials = await this.testimonialRepository.getTotalCount();
      return {
        success: true,
        message: "Review stats retrieved successfully",
        stats: { totalTestimonials },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get testimonial stats");
    }
  }
}

export class SyncGoogleReviewsUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
    private outscraperService: OutscraperService
  ) {}

  async execute(): Promise<{
    success: boolean;
    message: string;
    totalFetched: number;
    newAdded: number;
    updated: number;
  }> {
    try {
      const reviews = await this.outscraperService.fetchGoogleReviews(50);
      let newAdded = 0;
      let updated = 0;

      for (const review of reviews) {
        const result = await this.testimonialRepository.upsertGoogleReview(review);
        if (result.isNew) {
          newAdded++;
        } else {
          updated++;
        }
      }

      return {
        success: true,
        message: `Synced ${reviews.length} reviews from Google (${newAdded} new, ${updated} updated)`,
        totalFetched: reviews.length,
        newAdded,
        updated,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to sync Google reviews");
    }
  }
}

