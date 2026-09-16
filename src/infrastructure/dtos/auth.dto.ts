import { Types } from "mongoose";
import { Gender, LimitedRole, Role } from "../zod/common.zod";
import { User } from "../../domain/entities/user";
import { CommonCareerDataType } from "./user.dto";
import { Address } from "../../domain/entities/address";
import { ApiResponse, CommonResponse } from "./common.dts";

// Register usecase
export type RegisterRequest = Pick<User, "fullName" | "email" | "password" | "role">
export interface RegisterResponse extends CommonResponse {
  user: Pick<User, "verificationToken" | "role"> & {
    token: string;
  }
}

// Verify Otp
export interface OTPVerificationRequest {
  otp: string;
  verificationToken: string;
  role: string;
}

// Resend otp
export interface ResendOtpResponse extends ApiResponse {
  user: {
    verificationToken: string,
    role: string
  }
}
export interface ResendOtpRequest {
  role: string;
  verificationToken?: string;
  email?: string;
}

// Login
export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}
export interface LoginResponse extends CommonResponse {
  user: {
    _id?: Types.ObjectId;
    fullName: string,
    email?: string,
    profileImage?: string,
    role: Role | LimitedRole,
    phone?: string;
    phoneTwo?: string;
    gender?: Gender;
    nationality?: string;
    dob?: Date;
    linkedInUsername?: string;
    portfolioUrl?: string;
    resume?: string;
    professionalStatus?: string;
  },
  token: string;
  address?: Address | null;
  careerData?: CommonCareerDataType | null;
}


// Check Auth
export interface CheckUserStatusRequest {
  id: Types.ObjectId;
  role: string;
}
export interface CheckUserStatusResponse extends CommonResponse {
  status: number;
  user?: {
    _id?: Types.ObjectId;
    fullName: string;
    email?: string;
    profileImage?: string;
    role: Role | LimitedRole;
    phone?: string;
    phoneTwo?: string;
    gender?: Gender;
    nationality?: string;
    dob?: Date;
    linkedInUsername?: string;
    portfolioUrl?: string;
    resume?: string;
    professionalStatus?: string;
  };
}


// Verify email 
export type VerifyEmailRequest = Pick<User, "email">;
export interface VerifyEmailResponse extends ApiResponse {
  data: Pick<User, "email" | "verificationToken" | "role">;
}


// Update password
export type UpdatePasswordRequest = Pick<User, "email" | "role" | "verificationToken" | "password">;