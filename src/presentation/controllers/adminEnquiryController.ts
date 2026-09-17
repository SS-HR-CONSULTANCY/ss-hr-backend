import { Request, Response, NextFunction } from "express";
import { AdminGetAllEnquiriesUseCase, AdminUpdateEnquiryStatusUseCase, AdminDeleteEnquiryUseCase, AdminUpdateEnquiryAccountUseCase } from "../../application/adminUse-cases/adminEnquiryUseCases";
import { updateEnquiryStatusSchema } from "../../infrastructure/zod/enquiry.zod";
import { Types } from "mongoose";
import { HandleError } from "../../infrastructure/error/error";
import { EnquiryStatusType } from "../../domain/entities/enquiry";

export class AdminEnquiryController {
  constructor(
    private getAllEnquiriesUseCase: AdminGetAllEnquiriesUseCase,
    private updateEnquiryStatusUseCase: AdminUpdateEnquiryStatusUseCase,
    private deleteEnquiryUseCase: AdminDeleteEnquiryUseCase,
    private updateEnquiryAccountUseCase: AdminUpdateEnquiryAccountUseCase
  ) {}

  async getAllEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      
      const result = await this.getAllEnquiriesUseCase.execute({ page, limit });
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
}
