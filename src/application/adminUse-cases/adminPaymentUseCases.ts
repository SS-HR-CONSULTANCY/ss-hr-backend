import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  UpdatePaymentRequest,
  UpdatePaymentResponse,
  DeletePaymentRequest,
  GetPaymentByIdRequest,
  GetPaymentByIdResponse,
  GetPaymentsByCustomerRequest,
  GetPaymentsByPackageRequest,
  GetPaymentsByStatusRequest,
  GetPaymentGraphDataResponse,
} from "../../infrastructure/dtos/payment.dto";
import { Payment } from "../../domain/entities/payment";
import { ApiResponse } from "../../infrastructure/dtos/common.dts";
import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { PaymentRepositoryImpl } from "../../infrastructure/database/payment/paymentRepositoryImpl";

export class CreatePaymentUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {

      data.balanceAmount = data.totalAmount - data.paidAmount
      const createdPayment = await this.paymentRepository.createPayment(data);

      return {
        success: true,
        message: "Payment created successfully",
        payment: createdPayment,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to create payment");
    }
  }
}

export class UpdatePaymentUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: UpdatePaymentRequest): Promise<UpdatePaymentResponse> {
    try {
      const { _id, ...updateData } = data;

      const existingPayment = await this.paymentRepository.findPaymentById(_id);
      if (!existingPayment) throw new Error("Payment not found");

      const updatedPayment = new Payment(
        existingPayment._id,
        updateData.customerName ?? existingPayment.customerName,
        updateData.packageName ?? existingPayment.packageName,
        updateData.totalAmount ?? existingPayment.totalAmount,
        updateData.paidAmount ?? existingPayment.paidAmount,
        updateData.balanceAmount = updateData.totalAmount - updateData.paidAmount,
        updateData.paymentMethod ?? existingPayment.paymentMethod,
        updateData.paymentDate ?? existingPayment.paymentDate,
        updateData.referenceId ?? existingPayment.referenceId,
        updateData.paymentProof ?? existingPayment.paymentProof,
        updateData.adminNotes ?? existingPayment.adminNotes,
        updateData.paymentStatus ?? existingPayment.paymentStatus,
        existingPayment.createdAt,
        existingPayment.updatedAt
      );

      const updated = await this.paymentRepository.updatePayment(updatedPayment);
      if (!updated) throw new Error("Failed to update payment");

      return {
        success: true,
        message: "Payment updated successfully",
        payment: updated,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update payment");
    }
  }
}

export class DeletePaymentUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: DeletePaymentRequest): Promise<ApiResponse> {
    try {
      const { paymentId } = data;

      const existingPayment = await this.paymentRepository.findPaymentById(paymentId);
      if (!existingPayment) throw new Error("Payment not found");

      const deleted = await this.paymentRepository.deletePayment(paymentId);
      if (!deleted) throw new Error("Failed to delete payment");

      return { success: true, message: "Payment deleted successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to delete payment");
    }
  }
}

export class GetPaymentByIdUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: GetPaymentByIdRequest): Promise<GetPaymentByIdResponse> {
    try {
      const { paymentId } = data;

      const paymentData = await this.paymentRepository.findPaymentById(paymentId);
      if (!paymentData) throw new Error("Payment not found");

      return {
        success: true,
        message: "Payment retrieved successfully",
        payment: paymentData,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payment");
    }
  }
}

export class GetAllPaymentsUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: { page: number; limit: number }) {
    try {
      const result = await this.paymentRepository.findAllPayments(data);
      return {
        success: true,
        message: "Payments retrieved successfully",
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payments");
    }
  }
}

export class GetPaymentsByCustomerUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: GetPaymentsByCustomerRequest) {
    try {
      const { customerId, page, limit } = data;
      const result = await this.paymentRepository.findPaymentsByCustomerId(customerId, { page, limit });
      return {
        success: true,
        message: "Customer payments retrieved successfully",
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payments by customer");
    }
  }
}

export class GetPaymentsByPackageUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: GetPaymentsByPackageRequest) {
    try {
      const { packageId, page, limit } = data;
      const result = await this.paymentRepository.findPaymentsByPackageId(packageId, { page, limit });
      return {
        success: true,
        message: "Package payments retrieved successfully",
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payments by package");
    }
  }
}

export class GetPaymentsByStatusUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute(data: GetPaymentsByStatusRequest) {
    try {
      const { status, page, limit } = data;
      const result = await this.paymentRepository.findPaymentsByStatus(status, { page, limit });
      return {
        success: true,
        message: `${status} payments retrieved successfully`,
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payments by status");
    }
  }
}

export class GetPaymentStatsUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute() {
    try {
      const stats = await this.paymentRepository.getDetailedStats();
      return {
        success: true,
        message: "Payment stats retrieved successfully",
        stats,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payment stats");
    }
  }
}

export class GetPaymentGraphDataUseCase {
  constructor(private paymentRepository: PaymentRepositoryImpl) {}

  async execute() {
    try {
      const result = await this.paymentRepository.getPaymentGraphData();
      return {
        success: true,
        message: "Payment graph data retrieved successfully",
        data: result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get payment graph data");
    }
  }
}