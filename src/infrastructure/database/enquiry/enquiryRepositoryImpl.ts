import { Types } from "mongoose";
import { EnquiryStatusType, Enquiry } from "../../../domain/entities/enquiry";
import { IEnquiryRepository } from "../../../domain/repositories/IEnquiryRepository";
import { EnquiryModel, IEnquiry } from "./enquiryModel";
import { ApiPaginationRequest } from "../../dtos/common.dts";
import { CreateEnquiryRequest, GetAllEnquiriesResponse } from "../../dtos/enquiry.dto";

export class EnquiryRepositoryImpl implements IEnquiryRepository {
  private mapToEntity(enquiry: IEnquiry): Enquiry {
    return new Enquiry(
      enquiry._id as Types.ObjectId,
      enquiry.firstName,
      enquiry.lastName,
      enquiry.email,
      enquiry.phone,
      enquiry.subject,
      enquiry.message,
      enquiry.status,
      enquiry.createdAt,
      enquiry.updatedAt
    );
  }

  async createEnquiry(enquiryData: CreateEnquiryRequest): Promise<Enquiry> {
    const newEnquiry = new EnquiryModel(enquiryData);
    const savedEnquiry = await newEnquiry.save();
    return this.mapToEntity(savedEnquiry);
  }

  async findAllEnquiries({ page, limit }: ApiPaginationRequest): Promise<Omit<GetAllEnquiriesResponse, 'success' | 'message'>> {
    const skip = (page - 1) * limit;

    const [enquiries, totalCount] = await Promise.all([
      EnquiryModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EnquiryModel.countDocuments()
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const formattedData = enquiries.map((enquiry) => ({
      _id: enquiry._id as Types.ObjectId,
      firstName: enquiry.firstName,
      lastName: enquiry.lastName,
      email: enquiry.email,
      phone: enquiry.phone,
      subject: enquiry.subject,
      message: enquiry.message,
      status: enquiry.status,
      createdAt: (enquiry.createdAt as Date).toISOString(),
      updatedAt: (enquiry.updatedAt as Date).toISOString(),
    }));

    return {
      data: formattedData,
      totalCount,
      currentPage: page,
      totalPages,
    };
  }

  async findEnquiryById(enquiryId: Types.ObjectId): Promise<Enquiry | null> {
    const enquiry = await EnquiryModel.findById(enquiryId);
    if (!enquiry) return null;
    return this.mapToEntity(enquiry);
  }

  async updateEnquiryStatus(enquiryId: Types.ObjectId, status: EnquiryStatusType): Promise<Enquiry | null> {
    const updated = await EnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: { status } },
      { new: true }
    );
    if (!updated) return null;
    return this.mapToEntity(updated);
  }

  async getTotalCount(): Promise<number> {
    return await EnquiryModel.countDocuments();
  }

  async deleteEnquiry(enquiryId: Types.ObjectId): Promise<boolean> {
    const deleted = await EnquiryModel.findByIdAndDelete(enquiryId);
    return !!deleted;
  }
}
