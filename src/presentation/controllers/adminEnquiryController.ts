import { Request, Response, NextFunction } from "express";
import { AdminGetAllEnquiriesUseCase, AdminUpdateEnquiryStatusUseCase, AdminDeleteEnquiryUseCase, AdminUpdateEnquiryAccountUseCase, AdminUpdateEnquiryCategoryUseCase, AdminGetEnquiryAnalyticsUseCase, AdminGetEnquiryStatusDistributionUseCase, AdminGetEnquirySummaryStatsUseCase, AdminGetAccountLeadsUseCase, AdminUpdateEnquiryCommentUseCase, AdminUpdateEnquiryReminderUseCase } from "../../application/adminUse-cases/adminEnquiryUseCases";
import { updateEnquiryStatusSchema } from "../../infrastructure/zod/enquiry.zod";
import { Types } from "mongoose";
import { HandleError } from "../../infrastructure/error/error";
import { EnquiryStatusType } from "../../domain/entities/enquiry";

export class AdminEnquiryController {
  constructor(
    private getAllEnquiriesUseCase: AdminGetAllEnquiriesUseCase,
    private updateEnquiryStatusUseCase: AdminUpdateEnquiryStatusUseCase,
    private deleteEnquiryUseCase: AdminDeleteEnquiryUseCase,
    private updateEnquiryAccountUseCase: AdminUpdateEnquiryAccountUseCase,
    private updateEnquiryCategoryUseCase: AdminUpdateEnquiryCategoryUseCase,
    private getEnquiryAnalyticsUseCase: AdminGetEnquiryAnalyticsUseCase,
    private getEnquiryStatusDistributionUseCase: AdminGetEnquiryStatusDistributionUseCase,
    private getEnquirySummaryStatsUseCase: AdminGetEnquirySummaryStatsUseCase,
    private getAccountLeadsUseCase: AdminGetAccountLeadsUseCase,
    private updateEnquiryCommentUseCase: AdminUpdateEnquiryCommentUseCase,
    private updateEnquiryReminderUseCase: AdminUpdateEnquiryReminderUseCase
  ) {
    this.getAllEnquiries = this.getAllEnquiries.bind(this);
    this.updateEnquiryStatus = this.updateEnquiryStatus.bind(this);
    this.deleteEnquiry = this.deleteEnquiry.bind(this);
    this.updateEnquiryAccount = this.updateEnquiryAccount.bind(this);
    this.updateEnquiryCategory = this.updateEnquiryCategory.bind(this);
    this.getEnquiryAnalytics = this.getEnquiryAnalytics.bind(this);
    this.getEnquiryStatusDistribution = this.getEnquiryStatusDistribution.bind(this);
    this.getEnquirySummaryStats = this.getEnquirySummaryStats.bind(this);
    this.getAccountLeads = this.getAccountLeads.bind(this);
    this.updateEnquiryComment = this.updateEnquiryComment.bind(this);
    this.updateEnquiryReminder = this.updateEnquiryReminder.bind(this);
  }

  async getAllEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      
      const result = await this.getAllEnquiriesUseCase.execute({ page, limit, search, status });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateEnquiryStatusSchema.parse(req.body);
      const enquiryId = new Types.ObjectId(req.params.id);

      const result = await this.updateEnquiryStatusUseCase.execute({
        enquiryId,
        status: validatedData.status as EnquiryStatusType,
      });

      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async deleteEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enquiryId = req.params.id;
      const result = await this.deleteEnquiryUseCase.execute(enquiryId);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateEnquiryAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enquiryId = new Types.ObjectId(req.params.id);
      const { account } = req.body;
      const result = await this.updateEnquiryAccountUseCase.execute({ enquiryId, account: account ?? null });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateEnquiryCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enquiryId = new Types.ObjectId(req.params.id);
      const { category } = req.body;
      const result = await this.updateEnquiryCategoryUseCase.execute({ enquiryId, category: category ?? null });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getEnquiryAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as 'weekly' | 'monthly') || 'weekly';
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;

      const result = await this.getEnquiryAnalyticsUseCase.execute(period, status, category);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getEnquiryStatusDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as 'weekly' | 'monthly') || 'weekly';

      const result = await this.getEnquiryStatusDistributionUseCase.execute(period);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getEnquirySummaryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getEnquirySummaryStatsUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getAccountLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountName } = req.params;
      const data = await this.getAccountLeadsUseCase.execute(accountName);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEnquiryComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enquiryId = new Types.ObjectId(req.params.id);
      const { comment } = req.body;
      const result = await this.updateEnquiryCommentUseCase.execute({ enquiryId, comment: comment ?? null });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateEnquiryReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enquiryId = new Types.ObjectId(req.params.id);
      const { reminder } = req.body;
      const parsedReminder = reminder ? new Date(reminder) : null;
      const result = await this.updateEnquiryReminderUseCase.execute({ enquiryId, reminder: parsedReminder });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}
