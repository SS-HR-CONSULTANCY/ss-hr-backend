import { Types } from "mongoose";
import { ApiResponse } from "./common.dts";
import type { CurrencyType, PackageCategoryType } from "../../domain/entities/package";

// Create Package DTOs
export interface CreatePackageRequest {
  packageName: string;
  price: string;
  currency: CurrencyType;
  packageIncludes: string;
  packageCategory: PackageCategoryType;
}

export interface CreatePackageResponse extends ApiResponse {
  package?: {
    _id: Types.ObjectId;
    packageName: string;
    price: string;
    currency: CurrencyType;
    packageIncludes: string;
    packageCategory: PackageCategoryType;
  };
}

// Update Package DTOs
export interface UpdatePackageRequest {
  _id: Types.ObjectId;
  packageName?: string;
  price?: string;
  currency?: CurrencyType;
  packageIncludes?: string;
  packageCategory?: PackageCategoryType;
}

export interface UpdatePackageResponse extends ApiResponse {
  package?: {
    _id: Types.ObjectId;
    packageName: string;
    price: string;
    currency: CurrencyType;
    packageIncludes: string;
    packageCategory: PackageCategoryType;
  };
}

// Get Package DTOs
export interface GetPackageByIdRequest {
  packageId: Types.ObjectId;
}

export interface GetPackageByIdResponse extends ApiResponse {
  package?: {
    _id: Types.ObjectId;
    packageName: string;
    price: string;
    currency: CurrencyType;
    packageIncludes: string;
    packageCategory: PackageCategoryType;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Delete Package DTOs
export interface DeletePackageRequest {
  packageId: Types.ObjectId;
}

// Get All Packages Response
export interface GetAllPackagesResponse {
  success: boolean;
  message: string;
  data: {
    _id: Types.ObjectId;
    packageName: string;
    price: string;
    currency: CurrencyType;
    packageIncludes: string;
    packageCategory: PackageCategoryType;
    createdAt: string;
    updatedAt: string;
  }[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}