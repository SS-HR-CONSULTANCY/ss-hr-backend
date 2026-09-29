import { AdminLogModel, type LogAction, type LogModule } from "./adminLogModel";

export interface CreateLogDTO {
  action: LogAction;
  module: LogModule;
  description: string;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, any>;
  performedBy?: string;
}

export class AdminLogRepository {
  async create(dto: CreateLogDTO) {
    const log = new AdminLogModel(dto);
    return log.save();
  }

  async getAll(params: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (params.module) query.module = params.module;
    if (params.action) query.action = params.action;
    if (params.search) {
      query.$or = [
        { description: { $regex: params.search, $options: "i" } },
        { entityName: { $regex: params.search, $options: "i" } },
        { module: { $regex: params.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      AdminLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminLogModel.countDocuments(query),
    ]);

    return {
      success: true,
      data,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getStats() {
    const [totalLogs, actionStats, moduleStats, recentLogs] = await Promise.all([
      AdminLogModel.countDocuments(),
      AdminLogModel.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]),
      AdminLogModel.aggregate([
        { $group: { _id: "$module", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AdminLogModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return {
      success: true,
      data: {
        totalLogs,
        actionStats,
        moduleStats,
        recentLogs,
      },
    };
  }
}

// Singleton helper for easy logging from anywhere
export const adminLogRepository = new AdminLogRepository();

export async function logAdminAction(dto: CreateLogDTO) {
  try {
    await adminLogRepository.create(dto);
  } catch (e) {
    // Non-blocking — never fail the main operation
    console.error("[AdminLog] Failed to write log:", e);
  }
}
