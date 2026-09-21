import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { BillRepositoryImpl } from "../../infrastructure/database/bill/billRepositoryImpl";
import { ApiPaginationRequest } from "../../infrastructure/dtos/common.dts";

export class AdminGetBillsUseCase {
  constructor(private billRepository: BillRepositoryImpl) {}

  async execute(params: ApiPaginationRequest) {
    try {
      return await this.billRepository.getCompletedEnquiriesWithBills(params);
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get bills");
    }
  }
}

export class AdminUpdateBillUseCase {
  constructor(private billRepository: BillRepositoryImpl) {}

  async execute(enquiryId: string, enquiryType: string, data: any) {
    try {
      const bill = await this.billRepository.updateOrCreateBill(enquiryId, enquiryType, data);
      return {
        success: true,
        message: "Bill updated successfully",
        data: bill
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update bill");
    }
  }
}

export class AdminAddBillPaymentUseCase {
  constructor(private billRepository: BillRepositoryImpl) {}

  async execute(enquiryId: string, enquiryType: string, payment: { date: Date, amount: number }) {
    try {
      const bill = await this.billRepository.addPayment(enquiryId, enquiryType, payment);
      return {
        success: true,
        message: "Payment added successfully",
        data: bill
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to add payment");
    }
  }
}
