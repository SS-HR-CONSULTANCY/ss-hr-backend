import { Request, Response, NextFunction } from "express";
import { 
  AdminCreateWhatsappEnquiryUseCase, 
  AdminGetAllWhatsappEnquiriesUseCase, 
  AdminUpdateWhatsappEnquiryUseCase, 
  AdminUpdateWhatsappEnquiryStatusUseCase, 
  AdminDeleteWhatsappEnquiryUseCase 
} from "../../application/adminUse-cases/adminWhatsappEnquiryUseCases";
import { 
  createWhatsappEnquirySchema, 
  updateWhatsappEnquirySchema, 
  updateWhatsappEnquiryStatusSchema 
} from "../../infrastructure/zod/whatsappEnquiry.zod";
import { Types } from "mongoose";
import { HandleError } from "../../infrastructure/error/error";
import { EnquiryStatusType } from "../../domain/entities/enquiry";

export class AdminWhatsappEnquiryController {
  constructor(
    private createWhatsappEnquiryUseCase: AdminCreateWhatsappEnquiryUseCase,
    private getAllWhatsappEnquiriesUseCase: AdminGetAllWhatsappEnquiriesUseCase,
    private updateWhatsappEnquiryUseCase: AdminUpdateWhatsappEnquiryUseCase,
    private updateWhatsappEnquiryStatusUseCase: AdminUpdateWhatsappEnquiryStatusUseCase,
    private deleteWhatsappEnquiryUseCase: AdminDeleteWhatsappEnquiryUseCase
  ) {}

  async createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createWhatsappEnquirySchema.parse(req.body);
      const result = await this.createWhatsappEnquiryUseCase.execute(validatedData as any);
      res.status(201).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async getAllEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      
      const result = await this.getAllWhatsappEnquiriesUseCase.execute({ page, limit });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateWhatsappEnquirySchema.parse(req.body);
      const enquiryId = new Types.ObjectId(req.params.id);

      const result = await this.updateWhatsappEnquiryUseCase.execute({
        enquiryId,
        enquiryData: validatedData as any,
      });

      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateWhatsappEnquiryStatusSchema.parse(req.body);
      const enquiryId = new Types.ObjectId(req.params.id);

      const result = await this.updateWhatsappEnquiryStatusUseCase.execute({
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
      const result = await this.deleteWhatsappEnquiryUseCase.execute(enquiryId);
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}
