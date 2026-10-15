import { Types } from "mongoose";
import { EnquiryStatusType, Enquiry } from "../../../domain/entities/enquiry";
import { IEnquiryRepository } from "../../../domain/repositories/IEnquiryRepository";
import { EnquiryModel, IEnquiry } from "./enquiryModel";
import { ApiPaginationRequest } from "../../dtos/common.dts";
import { CreateEnquiryRequest, GetAllEnquiriesResponse } from "../../dtos/enquiry.dto";
import { WhatsappEnquiryModel } from "../whatsappEnquiry/whatsappEnquiryModel";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Start of the current period as a UTC instant, computed in IST:
 * weekly -> Monday 00:00 IST, monthly -> Jan 1 00:00 IST (current year).
 */
const getIstPeriodStart = (period: 'weekly' | 'monthly'): Date => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  if (period === 'weekly') {
    const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(y, m, d - daysSinceMonday) - IST_OFFSET_MS);
  }
  return new Date(Date.UTC(y, 0, 1) - IST_OFFSET_MS);
};

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
        .exec(),
      EnquiryModel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: enquiries.map(doc => this.mapToEntity(doc)),
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

  async getEnquiryStatusDistribution(period: 'weekly' | 'monthly' | 'all'): Promise<Array<{ status: string; count: number }>> {
    const matchStage: any = {};
    const whatsappMatchStage: any = {};

    // 'all' = all-time distribution (no date filter)
    if (period === 'weekly' || period === 'monthly') {
      const start = getIstPeriodStart(period);
      matchStage.createdAt = { $gte: start };
      whatsappMatchStage.date = { $gte: start };
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

  /**
   * Enquiry counts for charts.
   * - weekly : per day (YYYY-MM-DD) for the current week (Mon-Sun)
   * - monthly: per month (YYYY-MM) for the current year
   * Dates are bucketed in IST so results don't shift by timezone (e.g. early morning).
   */
  async getEnquiryStatsByPeriod(period: 'weekly' | 'monthly', status?: string, category?: string): Promise<Array<{ date: string; count: number }>> {
    const matchStage: any = {};
    const whatsappMatchStage: any = {};
    if (status && status !== 'all') {
      matchStage.status = status;
      whatsappMatchStage.status = status;
    }
    if (category && category !== 'all') {
      matchStage.category = category;
      whatsappMatchStage.category = category;
    }

    const start = getIstPeriodStart(period);
    matchStage.createdAt = { $gte: start };
    whatsappMatchStage.date = { $gte: start };

    const format = period === 'weekly' ? "%Y-%m-%d" : "%Y-%m";

    const buildPipeline = (match: any, dateField: string): any[] => [
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: `$${dateField}`, timezone: IST_TIMEZONE } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } }
    ];

    const [result1, result2] = await Promise.all([
      EnquiryModel.aggregate(buildPipeline(matchStage, "createdAt")),
      WhatsappEnquiryModel.aggregate(buildPipeline(whatsappMatchStage, "date"))
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
