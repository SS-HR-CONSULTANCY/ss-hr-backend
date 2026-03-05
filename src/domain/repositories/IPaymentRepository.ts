import { Types } from "mongoose";
import { Payment } from "../entities/payment";
import { ApiPaginationRequest, ApiResponse } from "../../infrastructure/dtos/common.dts";

export type CreatePayment = Pick<Payment,  "customerName" | "packageName" | "totalAmount" | "paidAmount" | "balanceAmount" | "paymentMethod" | "paymentDate" | "referenceId" | "adminNotes" | "paymentStatus" | "paymentProof" | "invoiceUrl">;
export type AdminFetchAllPayments = Array<Pick<Payment, "customerName" | "packageName" | "totalAmount" | "paidAmount" | "balanceAmount" | "paymentStatus" | "paymentProof" | "invoiceUrl" | "_id">>

export interface IPaymentRepository {

    createPayment(paymentData: CreatePayment): Promise<Payment>;

    findAllPayments({ page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>>;

    findPaymentById(paymentId: Types.ObjectId): Promise<Payment | null>;

    updatePayment(paymentData: Payment): Promise<Payment | null>;

    deletePayment(paymentId: Types.ObjectId): Promise<boolean>;

    getTotalCount(): Promise<number>;

    findPaymentsByCustomerId(customerId: Types.ObjectId, { page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>>;

    findPaymentsByPackageId(packageId: Types.ObjectId, { page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>>;

    findPaymentsByStatus(status: string, { page, limit }: ApiPaginationRequest): Promise<ApiResponse<AdminFetchAllPayments>>;

    getPaymentGraphData(): Promise<any>; // Using any temporarily or specific type if imported

    getDetailedStats(): Promise<{
        totalPayments: number;
        totalRevenue: number;
        totalPending: number;
    }>;

}