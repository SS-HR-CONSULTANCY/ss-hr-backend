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
      enquiry.updatedAt,
      enquiry.account,
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
      account: enquiry.account,
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

  async updateEnquiryAccount(enquiryId: Types.ObjectId, account: string | null): Promise<Enquiry | null> {
    const updated = await EnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: { account } },
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

  async getEnquiryStatusCounts(): Promise<Array<{ status: string; count: number }>> {
    const result = await EnquiryModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);
    return result;
  }

  async getEnquiryStatsByPeriod(period: 'weekly' | 'monthly', status?: string): Promise<Array<{ date: string; count: number }>> {
    const matchStage: any = {};
    if (status && status !== 'all') {
      matchStage.status = status;
    }

    const now = new Date();
    let format = "%Y-%m-%d";

    if (period === 'weekly') {
      // Current week from Monday
      const dayOfWeek = now.getDay(); 
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
      monday.setHours(0,0,0,0);
      matchStage.createdAt = { $gte: monday };
    } else if (period === 'monthly') {
      // Current month
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDayOfMonth.setHours(0,0,0,0);
      matchStage.createdAt = { $gte: firstDayOfMonth };
    }

    const pipeline: any[] = [];
    
    pipeline.push({ $match: matchStage });

    pipeline.push(
      {
        $group: {
          _id: { $dateToString: { format, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0
        }
      }
    );

    const result = await EnquiryModel.aggregate(pipeline);
    return result;
  }
}
