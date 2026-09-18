import { Types } from "mongoose";

export interface CreateCategoryRequest {
  name: string;
}

export interface CategoryResponse {
  _id: Types.ObjectId | string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GetAllCategoriesResponse {
  success: boolean;
  message: string;
  data: CategoryResponse[];
}
