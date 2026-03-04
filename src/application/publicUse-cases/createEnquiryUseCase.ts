import { handleUseCaseError } from "../../infrastructure/error/useCaseError";
import { EnquiryRepositoryImpl } from "../../infrastructure/database/enquiry/enquiryRepositoryImpl";
import { CreateEnquiryRequest, CreateEnquiryResponse } from "../../infrastructure/dtos/enquiry.dto";

export class CreateEnquiryUseCase {
  constructor(private enquiryRepository: EnquiryRepositoryImpl) {}

  async execute(data: CreateEnquiryRequest): Promise<CreateEnquiryResponse> {
    try {
      const createdEnquiry = await this.enquiryRepository.createEnquiry(data);

      return {
        success: true,
        message: "Enquiry submitted successfully",
        enquiry: {
          _id: createdEnquiry._id,
          firstName: createdEnquiry.firstName,
          lastName: createdEnquiry.lastName,
          email: createdEnquiry.email,
          status: createdEnquiry.status,
        },
      };
    } catch (error) {
      throw handleUseCaseError(error || "Failed to submit enquiry");
    }
  }
}
