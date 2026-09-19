import { User } from "../../domain/entities/user";

export interface CommonResponse {
  success?: boolean;
  message?: string;
}


export interface ApiPaginationRequest {
  page: number;
  limit: number;
  fromDate?: string;
  toDate?: string;
  category?: string;
  search?: string;
}

export interface ApiResponse<T = unknown> extends CommonResponse {
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
  data?: T;
}

export enum FolderNames {
  resumes = "resumes",
  profiles = "profiles",
  packages = "packages",
  payments = "payments",
}

export type FetchUsersForChatSideBar = Array<Pick<User, "_id" | "fullName" | "profileImage">>;

export interface UploadFilePresignedUrlRequest {
  folder: string;
  userId: string;
  fileName: string;
  fileType: string;
}

export interface UploadFilePresignedUrl {
  uploadUrl: string;
  key: string
}