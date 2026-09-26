import { Request, Response, NextFunction } from "express";
import { 
  AdminGetBillsUseCase, 
  AdminUpdateBillUseCase, 
  AdminAddBillPaymentUseCase 
} from "../../application/adminUse-cases/adminBillUseCases";
import { HandleError } from "../../infrastructure/error/error";

export class AdminBillController {
  constructor(
    private getBillsUseCase: AdminGetBillsUseCase,
    private updateBillUseCase: AdminUpdateBillUseCase,
    private addBillPaymentUseCase: AdminAddBillPaymentUseCase
  ) {
    this.getBills = this.getBills.bind(this);
    this.updateBill = this.updateBill.bind(this);
    this.addPayment = this.addPayment.bind(this);
  }

  async getBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string | undefined;
      
      const result = await this.getBillsUseCase.execute({ page, limit, search });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updateBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enquiryId } = req.params;
      const { enquiryType, invoiceAmount, currency, status, comment, dueDate } = req.body;
      
      if (!enquiryType) {
        res.status(400).json({ success: false, message: "enquiryType is required" });
        return;
      }

      const result = await this.updateBillUseCase.execute(enquiryId, enquiryType, { invoiceAmount, currency, status, comment, dueDate });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async addPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enquiryId } = req.params;
      const { enquiryType, date, amount } = req.body;
      
      if (!enquiryType || !date || amount === undefined) {
        res.status(400).json({ success: false, message: "enquiryType, date, and amount are required" });
        return;
      }

      const result = await this.addBillPaymentUseCase.execute(enquiryId, enquiryType, { date: new Date(date), amount: Number(amount) });
      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}
