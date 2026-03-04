import mongoose, { Document, Schema, Types } from "mongoose";
import { REGEX_CLIENT_NAME, REGEX_TESTIMONIAL, REGEX_TEXT_DOT_AMP } from "../../zod/regex";

export interface ITestimonial extends Document {
  _id: Types.ObjectId;
  clientName: string;
  designation: string;
  testimonial: string;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      minlength: [2, "Client name must be at least 2 characters"],
      maxlength: [100, "Client name cannot exceed 100 characters"],
      trim: true,
      match: [REGEX_CLIENT_NAME, "Client name can contain only letters and spaces"],
    },



    designation: {
      type: String,
      required: [true, "Designation is required"],
      minlength: [2, "Designation must be at least 2 characters"],
      maxlength: [100, "Designation cannot exceed 100 characters"],
      trim: true,
      match: [REGEX_TEXT_DOT_AMP, "Designation can contain only letters and spaces"],
    },

    testimonial: {
      type: String,
      required: [true, "Testimonial is required"],
      minlength: [20, "Testimonial must be at least 20 characters"],
      maxlength: [1000, "Testimonial cannot exceed 1000 characters"],
      match: [REGEX_TESTIMONIAL, "Testimonial must be between 20 and 1000 characters"],
      trim: true,
    },

    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TestimonialModel = mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);
