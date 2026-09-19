import { Types } from "mongoose";
import { IWhatsappEnquiryRepository } from "../../domain/repositories/IWhatsappEnquiryRepository";
import { CreateWhatsappEnquiryRequest, UpdateWhatsappEnquiryRequest, GetAllWhatsappEnquiriesResponse } from "../../infrastructure/dtos/whatsappEnquiry.dto";
import { WhatsappEnquiry } from "../../domain/entities/whatsappEnquiry";
import { EnquiryStatusType } from "../../domain/entities/enquiry";
import { ApiPaginationRequest } from "../../infrastructure/dtos/common.dts";

export class AdminCreateWhatsappEnquiryUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(enquiryData: CreateWhatsappEnquiryRequest): Promise<{ success: boolean; message: string; data: WhatsappEnquiry }> {
    const createdEnquiry = await this.whatsappEnquiryRepository.createEnquiry(enquiryData);
    return {
      success: true,
      message: "Whatsapp enquiry created successfully",
      data: createdEnquiry,
    };
  }
}

export class AdminGetAllWhatsappEnquiriesUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(params: ApiPaginationRequest): Promise<GetAllWhatsappEnquiriesResponse> {
    const result = await this.whatsappEnquiryRepository.findAllEnquiries(params);
    return {
      success: true,
      message: "Whatsapp enquiries fetched successfully",
      ...result,
    };
  }
}

export class AdminUpdateWhatsappEnquiryUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(params: { enquiryId: Types.ObjectId; enquiryData: UpdateWhatsappEnquiryRequest }): Promise<{ success: boolean; message: string; data: WhatsappEnquiry }> {
    const updated = await this.whatsappEnquiryRepository.updateEnquiry(params.enquiryId, params.enquiryData);
    if (!updated) {
      throw new Error("Whatsapp enquiry not found");
    }
    return {
      success: true,
      message: "Whatsapp enquiry updated successfully",
      data: updated,
    };
  }
}

export class AdminUpdateWhatsappEnquiryStatusUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(params: { enquiryId: Types.ObjectId; status: EnquiryStatusType }): Promise<{ success: boolean; message: string; data: WhatsappEnquiry }> {
    const updated = await this.whatsappEnquiryRepository.updateEnquiryStatus(params.enquiryId, params.status);
    if (!updated) {
      throw new Error("Whatsapp enquiry not found");
    }
    return {
      success: true,
      message: "Whatsapp enquiry status updated successfully",
      data: updated,
    };
  }
}

export class AdminDeleteWhatsappEnquiryUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(enquiryId: string): Promise<{ success: boolean; message: string }> {
    const id = new Types.ObjectId(enquiryId);
    const deleted = await this.whatsappEnquiryRepository.deleteEnquiry(id);
    if (!deleted) {
      throw new Error("Whatsapp enquiry not found");
    }
    return {
      success: true,
      message: "Whatsapp enquiry deleted successfully",
    };
  }
}

export class AdminUpdateWhatsappEnquiryCommentUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(params: { enquiryId: Types.ObjectId; comment: string | null }): Promise<{ success: boolean; message: string; data: WhatsappEnquiry }> {
    const updated = await this.whatsappEnquiryRepository.updateEnquiryComment(params.enquiryId, params.comment);
    if (!updated) {
      throw new Error("Whatsapp enquiry not found");
    }
    return {
      success: true,
      message: "Whatsapp enquiry comment updated successfully",
      data: updated,
    };
  }
}

export class AdminUpdateWhatsappEnquiryReminderUseCase {
  constructor(private whatsappEnquiryRepository: IWhatsappEnquiryRepository) {}

  async execute(params: { enquiryId: Types.ObjectId; reminder: Date | null }): Promise<{ success: boolean; message: string; data: WhatsappEnquiry }> {
    const updated = await this.whatsappEnquiryRepository.updateEnquiryReminder(params.enquiryId, params.reminder);
    if (!updated) {
      throw new Error("Whatsapp enquiry not found");
    }
    return {
      success: true,
      message: "Whatsapp enquiry reminder updated successfully",
      data: updated,
    };
  }
}
