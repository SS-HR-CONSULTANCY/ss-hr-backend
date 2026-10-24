import { Types } from "mongoose";
import { Testimonial } from "../../../domain/entities/testimonial";
import { ITestimonial, TestimonialModel } from "./testimonialModel";
import { ApiPaginationRequest, ApiResponse } from "../../dtos/common.dts";
import { AdminFetchAllTestimonials, CreateTestimonial, ITestimonialRepository, UpsertGoogleReviewData } from "../../../domain/repositories/ITestimonialRepository";

export class TestimonialRepositoryImpl implements ITestimonialRepository {
  private mapToEntity(testimonial: ITestimonial): Testimonial {
    return new Testimonial(
      testimonial._id,
      testimonial.clientName,
      testimonial.designation || "Customer",
      testimonial.testimonial,
      testimonial.isVisible !== undefined ? testimonial.isVisible : true,
      testimonial.createdAt,
      testimonial.updatedAt,
      testimonial.rating || 5,
      testimonial.reviewDate || testimonial.createdAt,
      testimonial.googleReviewId
    );
  }

  async createTestimonial(testimonial: CreateTestimonial): Promise<Testimonial> {
    try {
      const createdTestimonial = await TestimonialModel.create({
        ...testimonial,
        rating: testimonial.rating || 5,
        reviewDate: testimonial.reviewDate || new Date(),
        isVisible: true,
      });
      return this.mapToEntity(createdTestimonial);
    } catch (error: any) {
      throw new Error("Unable to create testimonial, please try again after a few minutes.");
    }
  }

  async findAllTestimonials({ page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllTestimonials>> {
    try {
      // Check if DB is empty, auto-seed default Google reviews if needed
      const count = await TestimonialModel.countDocuments();
      if (count === 0) {
        await this.seedDefaultReviews();
      }

      const skip = (page - 1) * limit;
      const [testimonials, totalCount] = await Promise.all([
        TestimonialModel.find(
          {},
          {
            _id: 1,
            clientName: 1,
            designation: 1,
            testimonial: 1,
            rating: 1,
            reviewDate: 1,
            isVisible: 1,
            googleReviewId: 1,
            createdAt: 1,
            updatedAt: 1,
          }
        )
          .skip(skip)
          .limit(limit)
          .sort({ reviewDate: -1, createdAt: -1 })
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
      const count = await TestimonialModel.countDocuments({ isVisible: true });
      if (count === 0) {
        await this.seedDefaultReviews();
      }

      const skip = (page - 1) * limit;
      const [testimonials, totalCount] = await Promise.all([
        TestimonialModel.find(
          { isVisible: true },
          {
            _id: 1,
            clientName: 1,
            designation: 1,
            testimonial: 1,
            rating: 1,
            reviewDate: 1,
            isVisible: 1,
            googleReviewId: 1,
            createdAt: 1,
            updatedAt: 1,
          }
        )
          .skip(skip)
          .limit(limit)
          .sort({ reviewDate: -1, createdAt: -1 })
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

  async upsertGoogleReview(reviewData: UpsertGoogleReviewData): Promise<{ isNew: boolean }> {
    try {
      let existing = null;
      if (reviewData.googleReviewId) {
        existing = await TestimonialModel.findOne({ googleReviewId: reviewData.googleReviewId });
      }

      if (!existing) {
        existing = await TestimonialModel.findOne({
          clientName: reviewData.clientName,
          testimonial: reviewData.testimonial,
        });
        if (existing) {
          existing.googleReviewId = reviewData.googleReviewId;
          existing.rating = reviewData.rating;
          existing.reviewDate = reviewData.reviewDate;
          if (reviewData.designation) {
            existing.designation = reviewData.designation;
          }
          await existing.save();
          return { isNew: false };
        }
      }

      if (existing) {
        existing.clientName = reviewData.clientName;
        existing.testimonial = reviewData.testimonial;
        existing.rating = reviewData.rating;
        existing.reviewDate = reviewData.reviewDate;
        if (reviewData.designation) {
          existing.designation = reviewData.designation;
        }
        await existing.save();
        return { isNew: false };
      } else {
        await TestimonialModel.create({
          clientName: reviewData.clientName,
          designation: reviewData.designation || "Google Reviewer",
          testimonial: reviewData.testimonial,
          rating: reviewData.rating,
          reviewDate: reviewData.reviewDate,
          googleReviewId: reviewData.googleReviewId,
          isVisible: true,
        });
        return { isNew: true };
      }
    } catch (error) {
      console.error("Error upserting Google review:", error);
      throw error;
    }
  }

  private async seedDefaultReviews(): Promise<void> {
    try {
      const defaultReviews = [
        { clientName: "Shafeek Sainudeen", designation: "Customer", testimonial: "Good Service ❤️", rating: 5, reviewDate: new Date("2026-10-20"), isVisible: true },
        { clientName: "Mahesh Kv", designation: "Local Guide", testimonial: "Good service", rating: 5, reviewDate: new Date("2026-10-18"), isVisible: true },
        { clientName: "Naser Hussain", designation: "Customer", testimonial: "Their service is best and price is affordable recommend for others", rating: 5, reviewDate: new Date("2026-10-15"), isVisible: true },
        { clientName: "Ganga Vs", designation: "Customer", testimonial: "Friendly staff and good service", rating: 5, reviewDate: new Date("2026-10-12"), isVisible: true },
        { clientName: "Dr.R.Naresh Kumar.", designation: "Local Guide", testimonial: "Got visa services with them . Recommended..", rating: 4, reviewDate: new Date("2026-10-10"), isVisible: true },
        { clientName: "Martin S", designation: "Customer", testimonial: "100% honest HR Consultancy in the UAE.Very very genuine approach and real Gentleman.**********", rating: 5, reviewDate: new Date("2026-10-05"), isVisible: true },
        { clientName: "Fathima sa", designation: "Customer", testimonial: "I had a great experience with SS HR Consultancy Tours and Travels. They were professional, honest, and supportive throughout the entire recruitment process. Their team guided me at every step and helped me secure a job in Dubai smoothly.", rating: 5, reviewDate: new Date("2026-10-01"), isVisible: true },
        { clientName: "Vinod Pillai", designation: "Customer", testimonial: "SS HR consultancy വളരെ വിശ്വസിക്കാൻ പറ്റുന്ന ഒരു സ്ഥാപനമാണ്. മാനേജ്മെന്റും stafsum വളരെ ഫ്രണ്ട്ലി ആണ്. എന്റെ എക്സ്പീരിയൻസിൽ നിന്നു പറയുന്നതാണ് ദുബായിൽ ഒരു ജോലിക്കായി try ചെയ്യുന്നവർക്ക് ചൂസ് ചെയ്യാൻ പറ്റുന്ന വളരെ വിശ്വസ്തമായ ഒരു സ്ഥാപനമാണ് ss", rating: 5, reviewDate: new Date("2026-09-28"), isVisible: true },
        { clientName: "Seetha Mohan", designation: "Customer", testimonial: "Excellent and trustworthy service! I always book my flight tickets and arrange my family's UAE visas through this agency. They are very responsive, professional, and always provide prompt assistance. Highly recommended. Thank you for your excellent service!", rating: 5, reviewDate: new Date("2026-09-20"), isVisible: true },
        { clientName: "Bover Shook", designation: "Customer", testimonial: "The service provided was exceptionally professional, offering thorough information and effective solutions. I highly recommend.", rating: 5, reviewDate: new Date("2026-09-15"), isVisible: true },
      ];
      await TestimonialModel.insertMany(defaultReviews);
    } catch {
      // Ignore if seeding fails
    }
  }
}