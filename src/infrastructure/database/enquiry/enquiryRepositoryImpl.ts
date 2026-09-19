import { Types } from "mongoose";
import { EnquiryStatusType, Enquiry } from "../../../domain/entities/enquiry";
import { IEnquiryRepository } from "../../../domain/repositories/IEnquiryRepository";
import { EnquiryModel, IEnquiry } from "./enquiryModel";
import { ApiPaginationRequest } from "../../dtos/common.dts";
import { CreateEnquiryRequest, GetAllEnquiriesResponse } from "../../dtos/enquiry.dto";
import { WhatsappEnquiryModel } from "../whatsappEnquiry/whatsappEnquiryModel";

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
      enquiry.category,
      enquiry.comment,
      enquiry.reminder,
      enquiry.statusHistory
    );
  }

  async createEnquiry(enquiryData: CreateEnquiryRequest): Promise<Enquiry> {
    const newEnquiry = new EnquiryModel(enquiryData);
    const savedEnquiry = await newEnquiry.save();
    return this.mapToEntity(savedEnquiry);
  }

  async findAllEnquiries({ page, limit, search, status }: ApiPaginationRequest & { status?: string }): Promise<Omit<GetAllEnquiriesResponse, 'success' | 'message'>> {
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const [enquiries, totalCount] = await Promise.all([
      EnquiryModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EnquiryModel.countDocuments(query)
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
      category: enquiry.category,
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
      { 
        $set: { status },
        $push: { statusHistory: { status, date: new Date() } }
      },
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

  async updateEnquiryCategory(enquiryId: Types.ObjectId, category: string | null): Promise<Enquiry | null> {
    const updated = await EnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: { category } },
      { new: true }
    );
    if (!updated) return null;
    return this.mapToEntity(updated);
  }

  async updateEnquiryComment(enquiryId: Types.ObjectId, comment: string | null): Promise<Enquiry | null> {
    const updated = await EnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: { comment } },
      { new: true }
    );
    if (!updated) return null;
    return this.mapToEntity(updated);
  }
  async updateEnquiryReminder(enquiryId: Types.ObjectId, reminder: Date | null): Promise<Enquiry | null> {
    const updated = await EnquiryModel.findByIdAndUpdate(
      enquiryId,
      { $set: { reminder } },
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
    const pipeline = [
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
    ];
    const [result1, result2] = await Promise.all([
      EnquiryModel.aggregate(pipeline),
      WhatsappEnquiryModel.aggregate(pipeline)
    ]);
    
    const merged = new Map<string, number>();
    for (const item of [...result1, ...result2]) {
      merged.set(item.status, (merged.get(item.status) || 0) + item.count);
    }
    
    return Array.from(merged.entries()).map(([status, count]) => ({ status, count }));
  }

  async getEnquiryStatusDistribution(period: 'weekly' | 'monthly'): Promise<Array<{ status: string; count: number }>> {
    const now = new Date();
    const matchStage: any = {};
    const whatsappMatchStage: any = {};

    if (period === 'weekly') {
      const dayOfWeek = now.getDay(); 
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
      monday.setHours(0,0,0,0);
      matchStage.createdAt = { $gte: monday };
      whatsappMatchStage.date = { $gte: monday };
    } else if (period === 'monthly') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDayOfMonth.setHours(0,0,0,0);
      matchStage.createdAt = { $gte: firstDayOfMonth };
      whatsappMatchStage.date = { $gte: firstDayOfMonth };
    }

    const pipeline = [
      { $match: matchStage },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ];

    const whatsappPipeline = [
      { $match: whatsappMatchStage },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ];

    const [result1, result2] = await Promise.all([
      EnquiryModel.aggregate(pipeline),
      WhatsappEnquiryModel.aggregate(whatsappPipeline)
    ]);
    
    const merged = new Map<string, number>();
    for (const item of [...result1, ...result2]) {
      const status = item.status || 'unknown';
      merged.set(status, (merged.get(status) || 0) + item.count);
    }
    
    return Array.from(merged.entries()).map(([status, count]) => ({ status, count }));
  }

  async getEnquiryStatsByPeriod(period: 'weekly' | 'monthly', status?: string, category?: string): Promise<Array<{ date: string; count: number }>> {
    const matchStage: any = {};
    if (status && status !== 'all') {
      matchStage.status = status;
    }
    if (category && category !== 'all') {
      matchStage.category = category;
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

    const whatsappMatchStage: any = {};
    if (status && status !== 'all') {
      whatsappMatchStage.status = status;
    }
    if (category && category !== 'all') {
      whatsappMatchStage.category = category;
    }
    if (period === 'weekly') {
      const dayOfWeek = now.getDay(); 
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
      monday.setHours(0,0,0,0);
      whatsappMatchStage.date = { $gte: monday };
    } else if (period === 'monthly') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDayOfMonth.setHours(0,0,0,0);
      whatsappMatchStage.date = { $gte: firstDayOfMonth };
    }

    const whatsappPipeline: any[] = [];
    whatsappPipeline.push({ $match: whatsappMatchStage });
    whatsappPipeline.push(
      {
        $group: {
          _id: { $dateToString: { format, date: "$date" } },
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

    const [result1, result2] = await Promise.all([
      EnquiryModel.aggregate(pipeline),
      WhatsappEnquiryModel.aggregate(whatsappPipeline)
    ]);
    
    const merged = new Map<string, number>();
    for (const item of [...result1, ...result2]) {
      merged.set(item.date, (merged.get(item.date) || 0) + item.count);
    }
    
    return Array.from(merged.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSummaryStats(): Promise<{ total: number; visitingPackage: number; inProgress: number; pending: number; completed: number }> {
    const pipeline = [
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          visitingPackage: {
            $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ["$category", ""] }, regex: /visiting package/i } }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          inProgress: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "pending"] },
                    { $ne: ["$status", "completed"] },
                    { $ne: ["$status", "not_interested"] },
                    { $ne: ["$status", "rejected_application"] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const [res1, res2] = await Promise.all([
      EnquiryModel.aggregate(pipeline),
      WhatsappEnquiryModel.aggregate(pipeline)
    ]);

    const d1 = res1[0] || { total: 0, visitingPackage: 0, inProgress: 0, pending: 0, completed: 0 };
    const d2 = res2[0] || { total: 0, visitingPackage: 0, inProgress: 0, pending: 0, completed: 0 };

    return {
      total: d1.total + d2.total,
      visitingPackage: d1.visitingPackage + d2.visitingPackage,
      inProgress: d1.inProgress + d2.inProgress,
      pending: d1.pending + d2.pending,
      completed: d1.completed + d2.completed,
    };
  }

  async getEnquiriesByAccount(accountName: string): Promise<any[]> {
    const web = await EnquiryModel.find({ account: accountName }).lean();
    const wa = await WhatsappEnquiryModel.find({ account: accountName }).lean();

    const formattedWeb = web.map(w => ({
      _id: w._id.toString(),
      name: `${w.firstName} ${w.lastName}`.trim(),
      contactInfo: w.phone || w.email || 'N/A',
      subject: w.subject || 'No Subject',
      status: w.status,
      category: w.category || 'N/A',
      source: "Website",
      createdAt: (w.createdAt as Date).toISOString()
    }));

    const formattedWa = wa.map(w => ({
      _id: w._id.toString(),
      name: w.name,
      contactInfo: w.contactNumber,
      subject: w.subject || 'WhatsApp Enquiry',
      status: w.status,
      category: w.category || 'N/A',
      source: "WhatsApp",
      createdAt: (w.createdAt as Date).toISOString()
    }));

    return [...formattedWeb, ...formattedWa].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
