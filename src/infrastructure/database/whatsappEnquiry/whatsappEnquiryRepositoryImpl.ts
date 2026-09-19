import { Types } from "mongoose";
import { WhatsappEnquiry } from "../../../domain/entities/whatsappEnquiry";
import { EnquiryStatusType } from "../../../domain/entities/enquiry";
import { IWhatsappEnquiryRepository } from "../../../domain/repositories/IWhatsappEnquiryRepository";
import { WhatsappEnquiryModel, IWhatsappEnquiry } from "./whatsappEnquiryModel";
import { ApiPaginationRequest } from "../../dtos/common.dts";
import { CreateWhatsappEnquiryRequest, GetAllWhatsappEnquiriesResponse, UpdateWhatsappEnquiryRequest } from "../../dtos/whatsappEnquiry.dto";

export class WhatsappEnquiryRepositoryImpl implements IWhatsappEnquiryRepository {
  private mapToEntity(doc: IWhatsappEnquiry): WhatsappEnquiry {
    return new WhatsappEnquiry(
      doc._id as Types.ObjectId,
      doc.name,
      doc.contactNumber,
      doc.subject,
      doc.status,
      doc.date,
      doc.createdAt,
      doc.updatedAt,
      doc.account,
      doc.category,
    );
  }

  async createEnquiry(enquiryData: CreateWhatsappEnquiryRequest): Promise<WhatsappEnquiry> {
    const created = await WhatsappEnquiryModel.create(enquiryData);
    return this.mapToEntity(created);
  }

  async findAllEnquiries(params: ApiPaginationRequest): Promise<Omit<GetAllWhatsappEnquiriesResponse, 'success' | 'message'>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { name: searchRegex },
        { contactNumber: searchRegex },
        { subject: searchRegex }
      ];
    }

    const [enquiries, totalCount] = await Promise.all([
      WhatsappEnquiryModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      WhatsappEnquiryModel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: enquiries.map(this.mapToEntity.bind(this)),
      totalCount,
      totalPages,
      currentPage: page,
    };
  }

  async findEnquiryById(enquiryId: Types.ObjectId): Promise<WhatsappEnquiry | null> {
    const enquiry = await WhatsappEnquiryModel.findById(enquiryId);
    if (!enquiry) return null;
    return this.mapToEntity(enquiry);
  }

  async updateEnquiry(enquiryId: Types.ObjectId, enquiryData: UpdateWhatsappEnquiryRequest): Promise<WhatsappEnquiry | null> {
    const updated = await WhatsappEnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: enquiryData },
      { new: true }
    );
    if (!updated) return null;
    return this.mapToEntity(updated);
  }

  async updateEnquiryStatus(enquiryId: Types.ObjectId, status: EnquiryStatusType): Promise<WhatsappEnquiry | null> {
    const updated = await WhatsappEnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: { status } },
      { new: true }
    );
    if (!updated) return null;
    return this.mapToEntity(updated);
  }

  async deleteEnquiry(enquiryId: Types.ObjectId): Promise<boolean> {
    const result = await WhatsappEnquiryModel.findByIdAndDelete(enquiryId);
    return result !== null;
  }

  async getTotalCount(): Promise<number> {
    return await WhatsappEnquiryModel.countDocuments();
  }
}
