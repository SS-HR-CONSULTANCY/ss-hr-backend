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


export class CreateTestimonialUseCase {
  constructor(
    private testimonialRepository: TestimonialRepositoryImpl,
  ) { }

  async execute(data: CreateTestimonialRequest): Promise<CreateTestimonialResponse> {
    try {
      const { clientName, designation, testimonial } = data;

      const createdTestimonial = await this.testimonialRepository.createTestimonial({
        clientName,
        designation,
        testimonial,
      });

      if(!createdTestimonial) throw new Error("Testimonial adding failed");


      return {
        success: true,
        message: "Review created successfully",
        testimonial: {
          _id: createdTestimonial._id,
          clientName: createdTestimonial.clientName,
          designation: createdTestimonial.designation,
          testimonial: createdTestimonial.testimonial,
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
      const { _id, clientName, designation, isVisible, testimonial } = data;

      const existingTestimonial = await this.testimonialRepository.findTestimonialById(_id);
      if (!existingTestimonial) throw new Error("Testimonial not found");

      existingTestimonial.clientName = clientName || existingTestimonial.clientName;
      existingTestimonial.designation = designation || existingTestimonial.designation;
      existingTestimonial.isVisible = isVisible ?? existingTestimonial.isVisible;
      existingTestimonial.testimonial = testimonial || existingTestimonial.testimonial;

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
          designation: testimonial.designation,
          testimonial: testimonial.testimonial,
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
