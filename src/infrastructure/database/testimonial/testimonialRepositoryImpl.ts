import { Types } from "mongoose";
import { Testimonial } from "../../../domain/entities/testimonial";
import { ITestimonial, TestimonialModel } from "./testimonialModel";
import { ApiPaginationRequest, ApiResponse } from "../../dtos/common.dts";
import { AdminFetchAllTestimonials, CreateTestimonial, ITestimonialRepository } from "../../../domain/repositories/ITestimonialRepository";

export class TestimonialRepositoryImpl implements ITestimonialRepository {
  private mapToEntity(testimonial: ITestimonial): Testimonial {
    return new Testimonial(
      testimonial._id,
      testimonial.clientName,
      testimonial.designation,
      testimonial.testimonial,
      testimonial.isVisible,
      testimonial.createdAt,
      testimonial.updatedAt
    );
  }

  async createTestimonial(testimonial: CreateTestimonial): Promise<Testimonial> {
    try {
      const createdTestimonial = await TestimonialModel.create({ ...testimonial, isVisible: true });
      return this.mapToEntity(createdTestimonial);
    } catch (error: any) {
      throw new Error("Unable to create testimonial, please try again after a few minutes.");
    }
  }

  async findAllTestimonials({ page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllTestimonials>> {
    try {
      const skip = (page - 1) * limit;
      const [testimonials, totalCount] = await Promise.all([
        TestimonialModel.find(
          {},
          {
            _id: 1,
            clientName: 1,
            designation: 1,
            testimonial: 1,
            isVisible: 1,
            createdAt: 1,
          }
        )
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        TestimonialModel.countDocuments(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: testimonials.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch testimonials from database.");
    }
  }

  async findTestimonialById(testimonialId: Types.ObjectId): Promise<Testimonial | null> {
    try {
      const testimonial = await TestimonialModel.findById(testimonialId);
      return testimonial ? this.mapToEntity(testimonial) : null;
    } catch (error) {
      throw new Error("Testimonial not found.");
    }
  }

  async updateTestimonial(testimonial: Testimonial): Promise<Testimonial | null> {
    try {
      const updatedTestimonial = await TestimonialModel.findByIdAndUpdate(testimonial._id, testimonial, {
        new: true,
      });
      return updatedTestimonial ? this.mapToEntity(updatedTestimonial) : null;
    } catch (error) {
      throw new Error("Unable to update testimonial.");
    }
  }

  async deleteTestimonial(testimonialId: Types.ObjectId): Promise<boolean> {
    try {
      const result = await TestimonialModel.findByIdAndDelete(testimonialId);
      return !!result;
    } catch (error) {
      throw new Error("Failed to delete testimonial");
    }
  }

  async getTotalCount(): Promise<number> {
    try {
      return await TestimonialModel.countDocuments();
    } catch (error) {
      throw new Error("Failed to get total count");
    }
  }

  async findVisibleTestimonials({ page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllTestimonials>> {
    try {
      const skip = (page - 1) * limit;
      const [testimonials, totalCount] = await Promise.all([
        TestimonialModel.find(
          { isVisible: true },
          {
            _id: 1,
            clientName: 1,
            designation: 1,
            testimonial: 1,
            isVisible: 1,
            createdAt: 1,
          }
        )
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        TestimonialModel.countDocuments({ isVisible: true }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      return {
        data: testimonials.map(this.mapToEntity),
        totalPages,
        currentPage: page,
        totalCount,
      };
    } catch (error) {
      throw new Error("Failed to fetch visible testimonials from database.");
    }
  }
}