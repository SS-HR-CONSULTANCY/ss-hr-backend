import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { EnquiryRepositoryImpl } from "../../infrastructure/database/enquiry/enquiryRepositoryImpl";
import { GetAllEnquiriesResponse, UpdateEnquiryStatusRequest } from "../../infrastructure/dtos/enquiry.dto";

export class AdminGetAllEnquiriesUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute(data: { page: number; limit: number }): Promise<GetAllEnquiriesResponse> {
    try {
      const result = await this.enquiryRepository.findAllEnquiries(data);
      return {
        success: true,
        message: "Enquiries retrieved successfully",
        ...result,
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get enquiries");
    }
  }
}

export class AdminUpdateEnquiryStatusUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute({ enquiryId, status }: UpdateEnquiryStatusRequest) {
    try {
      const existingEnquiry = await this.enquiryRepository.findEnquiryById(enquiryId);
      if (!existingEnquiry) throw new Error("Enquiry not found");

      const updated = await this.enquiryRepository.updateEnquiryStatus(enquiryId, status);
      if (!updated) throw new Error("Failed to update enquiry status");

      return {
        success: true,
        message: "Enquiry status updated successfully",
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update enquiry status");
    }
  }
}

export class AdminDeleteEnquiryUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute(enquiryId: string) {
    try {
      const deleted = await this.enquiryRepository.deleteEnquiry(enquiryId as any);
      if (!deleted) throw new Error("Enquiry not found or already deleted");
      return { success: true, message: "Enquiry deleted successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to delete enquiry");
    }
  }
}

export class AdminUpdateEnquiryAccountUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute({ enquiryId, account }: { enquiryId: any; account: string | null }) {
    try {
      const updated = await this.enquiryRepository.updateEnquiryAccount(enquiryId, account);
      if (!updated) throw new Error("Enquiry not found");
      return { success: true, message: "Enquiry account updated successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update enquiry account");
    }
  }
}

export class AdminGetEnquiryAnalyticsUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute(period: 'weekly' | 'monthly', status?: string) {
    try {
      const data = await this.enquiryRepository.getEnquiryStatsByPeriod(period, status);
      return {
        success: true,
        message: "Enquiry analytics retrieved successfully",
        data
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get enquiry analytics");
    }
  }
}

export class AdminGetEnquiryStatusDistributionUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute(period: 'weekly' | 'monthly') {
    try {
      const data = await this.enquiryRepository.getEnquiryStatusDistribution(period);
      return {
        success: true,
        message: "Enquiry status distribution retrieved successfully",
        data
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to get enquiry status distribution");
    }
  }
}

export class AdminUpdateEnquiryCategoryUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute({ enquiryId, category }: { enquiryId: any; category: string | null }) {
    try {
      const updated = await this.enquiryRepository.updateEnquiryCategory(enquiryId, category);
      if (!updated) throw new Error("Enquiry not found");
      return { success: true, message: "Enquiry category updated successfully" };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to update enquiry category");
    }
  }
}
