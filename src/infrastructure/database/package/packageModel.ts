import mongoose, { Document, Schema, Types } from "mongoose";
import { REGEX_TEXT_DOT_AMP } from "../../zod/regex";
import type { CurrencyType, PackageCategoryType } from "../../../domain/entities/package";

export interface IPackage extends Document {
  _id: Types.ObjectId;
  packageName: string;
  price: string;
  currency: CurrencyType;
  packageIncludes: string;
  packageCategory: PackageCategoryType;
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema = new Schema<IPackage>({
  packageName: {
    type: String,
    required: [true, "Package name is required"],
    minLength: [2, "Package name must be at least 2 characters"],
    maxlength: [100, "Package name must be at most 100 characters"],
    match: [REGEX_TEXT_DOT_AMP, "Package name can only contain letters, numbers, spaces, dot, & and -"],
    trim: true,
  },
  price: {
    type: String,
    required: [true, "Price is required"],
    trim: true,
  },
  currency: {
    type: String,
    enum: ["Rs.", "AED"],
    required: [true, "Currency is required"],
  },
  packageIncludes: {
    type: String,
    required: [true, "Package includes is required"],
    minLength: [5, "Package includes must be at least 5 characters"],
    maxlength: [2000, "Package includes must be at most 2000 characters"],
    trim: true,
  },
  packageCategory: {
    type: String,
    enum: ["general", "visitvisa", "visa"],
    required: [true, "Package category is required"],
    default: "general",
  },
}, {
  timestamps: true
});

export const PackageModel = mongoose.model<IPackage>("Package", PackageSchema);
