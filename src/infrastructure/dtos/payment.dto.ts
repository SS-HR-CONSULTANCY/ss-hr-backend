import { Types } from "mongoose";
import { ApiResponse } from "./common.dts";
import { PaymentMethodType, PaymentStatusType } from "../zod/common.zod";
import { Payment } from "../../domain/entities/payment";

// Create Payment DTOs
export interface CreatePaymentRequest {
  customerName: string,
  packageName: string,
  totalAmount: number,
  paidAmount: number,
  balanceAmount: number,
  paymentMethod: PaymentMethodType,
  paymentDate: Date,
  adminNotes: string,
  referenceId: string,
  paymentProof: string,
  invoiceUrl: string,
  paymentStatus: PaymentStatusType,
}

export interface CreatePaymentResponse extends ApiResponse {
  payment: Payment;
}

// Update Payment DTOs
export interface UpdatePaymentRequest {
  _id: Types.ObjectId;
  customerName: string,
  packageName: string,
  totalAmount: number,
  paidAmount: number,
  balanceAmount: number,
  paymentMethod: PaymentMethodType,
  paymentDate: Date,
  adminNotes: string,
  referenceId: string,
  paymentProof: string,
  invoiceUrl: string,
  paymentStatus: PaymentStatusType,
}

export interface UpdatePaymentResponse extends ApiResponse {
  payment?: {
    _id: Types.ObjectId;
    customerName: string,
    packageName: string,
    totalAmount: number,
    paidAmount: number,
    balanceAmount: number,
    paymentMethod: PaymentMethodType,
    paymentDate: Date,
    adminNotes: string,
    referenceId: string,
    paymentProof: string,
    invoiceUrl: string,
    paymentStatus: PaymentStatusType,
  };
}

// Get Payment DTOs
export interface GetPaymentByIdRequest {
  paymentId: Types.ObjectId;
}

export interface GetPaymentByIdResponse extends ApiResponse {
  payment: Payment;
}

// Delete Payment DTOs
export interface DeletePaymentRequest {
  paymentId: Types.ObjectId;
}

// Get Payments by Customer DTOs
export interface GetPaymentsByCustomerRequest {
  customerId: Types.ObjectId;
  page: number;
  limit: number;
}

// Get Payments by Package DTOs
export interface GetPaymentsByPackageRequest {
  packageId: Types.ObjectId;
  page: number;
  limit: number;
}

// Get Payments by Status DTOs
export interface GetPaymentsByStatusRequest {
  status: string;
  page: number;
  limit: number;
}

export interface GetPaymentGraphDataResponse {
  monthlyData: Array<{
    name: string;
    expense: number;
    invoice: number;
    receipt: number;
  }>;
  yearlyData: Array<{
    name: string;
    expense: number;
    invoice: number;
    receipt: number;
  }>;
}