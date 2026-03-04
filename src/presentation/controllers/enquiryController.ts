import { Request, Response, NextFunction } from "express";
import { CreateEnquiryUseCase } from "../../application/publicUse-cases/createEnquiryUseCase";
import { createEnquirySchema } from "../../infrastructure/zod/enquiry.zod";
import { HandleError } from "../../infrastructure/error/error";

export class EnquiryController {
  constructor(private createEnquiryUseCase: CreateEnquiryUseCase) {}

  async createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createEnquirySchema.parse(req.body);
      const requestData = {
        ...validatedData,
        phone: validatedData.phone ?? undefined,
      };
      const result = await this.createEnquiryUseCase.execute(requestData);
      res.status(201).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}

