import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITestimonial extends Document {
  _id: Types.ObjectId;
  clientName: string;
  designation?: string;
  testimonial: string;
  rating?: number;
  reviewDate?: Date;
  isVisible: boolean;
  googleReviewId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      minlength: [1, "Client name must be at least 1 character"],
      maxlength: [100, "Client name cannot exceed 100 characters"],
      trim: true,
    },

    designation: {
      type: String,
      default: "Customer",
      maxlength: [100, "Designation cannot exceed 100 characters"],
      trim: true,
    },

    testimonial: {
      type: String,
      required: [true, "Review text is required"],
      minlength: [1, "Review text must be at least 1 character"],
      maxlength: [3000, "Review text cannot exceed 3000 characters"],
      trim: true,
    },

    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      default: 5,
    },

    reviewDate: {
      type: Date,
      default: Date.now,
    },

    isVisible: {
      type: Boolean,
      default: true,
    },

    googleReviewId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TestimonialModel = mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);
