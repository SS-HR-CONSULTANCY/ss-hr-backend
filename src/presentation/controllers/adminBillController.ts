import { Request, Response, NextFunction } from "express";
import { logAdminAction } from "../../infrastructure/database/adminLog/adminLogRepository";
import { 
  AdminGetBillsUseCase, 
  AdminUpdateBillUseCase, 
  AdminAddBillPaymentUseCase,
  AdminUpdateBillPaymentUseCase,
  AdminDeleteBillPaymentUseCase
} from "../../application/adminUse-cases/adminBillUseCases";
import { HandleError } from "../../infrastructure/error/error";
import { EnquiryModel } from "../../infrastructure/database/enquiry/enquiryModel";
import { WhatsappEnquiryModel } from "../../infrastructure/database/whatsappEnquiry/whatsappEnquiryModel";

// ─── Helper: resolve client name from enquiry ───────────────────────────────
async function resolveClientName(enquiryId: string, enquiryType: string): Promise<string> {
  try {
    if (enquiryType === "Website") {
      const enq: any = await EnquiryModel.findById(enquiryId).lean();
      if (enq) return `${enq.firstName || ""} ${enq.lastName || ""}`.trim() || "Unknown";
    } else {
      const enq: any = await WhatsappEnquiryModel.findById(enquiryId).lean();
      if (enq) return enq.name || "Unknown";
    }
  } catch { /* non-blocking */ }
  return "Unknown";
}

export class AdminBillController {
  constructor(
    private getBillsUseCase: AdminGetBillsUseCase,
    private updateBillUseCase: AdminUpdateBillUseCase,
    private addBillPaymentUseCase: AdminAddBillPaymentUseCase,
    private updateBillPaymentUseCase: AdminUpdateBillPaymentUseCase,
    private deleteBillPaymentUseCase: AdminDeleteBillPaymentUseCase
  ) {
    this.getBills = this.getBills.bind(this);
    this.updateBill = this.updateBill.bind(this);
    this.addPayment = this.addPayment.bind(this);
    this.updatePayment = this.updatePayment.bind(this);
    this.deletePayment = this.deletePayment.bind(this);
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
      const { enquiryType, invoiceAmount, currency, status, serviceStatus, comment, dueDate } = req.body;
      
      if (!enquiryType) {
        res.status(400).json({ success: false, message: "enquiryType is required" });
        return;
      }

      const result: any = await this.updateBillUseCase.execute(enquiryId, enquiryType, { invoiceAmount, currency, status, serviceStatus, comment, dueDate });
      
      const changes: Record<string, any> = {};
      if (invoiceAmount !== undefined) changes.invoiceAmount = invoiceAmount;
      if (currency) changes.currency = currency;
      if (status) changes.status = status;
      if (serviceStatus) changes.serviceStatus = serviceStatus;
      if (dueDate) changes.dueDate = dueDate;

      const clientName = await resolveClientName(enquiryId, enquiryType);
      const invoiceNumber = result?.data?.invoiceNumber || "";

      logAdminAction({
        action: "UPDATE",
        module: "Bill",
        description: `Bill ${invoiceNumber} updated for ${clientName}`,
        entityId: enquiryId,
        entityName: invoiceNumber ? `${invoiceNumber} — ${clientName}` : clientName,
        changes,
      });

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

      const result: any = await this.addBillPaymentUseCase.execute(enquiryId, enquiryType, { date: new Date(date), amount: Number(amount) });

      const clientName = await resolveClientName(enquiryId, enquiryType);
      const invoiceNumber = result?.data?.invoiceNumber || "";

      logAdminAction({
        action: "CREATE",
        module: "BillPayment",
        description: `Payment of ${amount} recorded for invoice ${invoiceNumber} (${clientName})`,
        entityId: enquiryId,
        entityName: invoiceNumber ? `${invoiceNumber} — ${clientName}` : clientName,
        changes: { date, amount: Number(amount), currency: result?.data?.currency },
      });

      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }

  async updatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enquiryId, paymentId } = req.params;
      const { enquiryType, date, amount } = req.body;
      
      if (!enquiryType) {
        res.status(400).json({ success: false, message: "enquiryType is required" });
        return;
      }

      // ── Snapshot old payment values before update ──────────────────────
      let oldDate: Date | undefined;
      let oldAmount: number | undefined;
      try {
        const { BillModel } = await import("../../infrastructure/database/bill/billModel.js");
        const existingBill: any = await BillModel.findOne({ enquiryId }).lean();
        if (existingBill) {
          const oldItem = existingBill.paymentHistory?.find((p: any, idx: number) =>
            p._id?.toString() === paymentId || paymentId === idx.toString()
          );
          if (oldItem) {
            oldDate   = oldItem.date;
            oldAmount = oldItem.amount;
          }
        }
      } catch { /* non-blocking */ }

      const paymentData: { date?: Date; amount?: number } = {};
      if (date) paymentData.date = new Date(date);
      if (amount !== undefined) paymentData.amount = Number(amount);

      const result: any = await this.updateBillPaymentUseCase.execute(enquiryId, enquiryType, paymentId, paymentData);

      // ── Only log fields that actually changed ─────────────────────────
      const changes: Record<string, any> = {};
      const currency = result?.data?.currency;
      if (date && oldDate && new Date(date).getTime() !== new Date(oldDate).getTime()) {
        changes.date = new Date(date);
      } else if (date && !oldDate) {
        changes.date = new Date(date);
      }
      if (amount !== undefined && oldAmount !== undefined && Number(amount) !== oldAmount) {
        changes.amount = Number(amount);
        if (currency) changes.currency = currency;
      } else if (amount !== undefined && oldAmount === undefined) {
        changes.amount = Number(amount);
        if (currency) changes.currency = currency;
      }

      const clientName = await resolveClientName(enquiryId, enquiryType);
      const invoiceNumber = result?.data?.invoiceNumber || "";

      logAdminAction({
        action: "UPDATE",
        module: "BillPayment",
        description: `Payment updated for invoice ${invoiceNumber} (${clientName})`,
        entityId: paymentId,
        entityName: invoiceNumber ? `${invoiceNumber} — ${clientName}` : clientName,
        changes,
      });

      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }


  async deletePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enquiryId, paymentId } = req.params;
      const enquiryType = (req.body.enquiryType || req.query.enquiryType) as string;
      
      if (!enquiryType) {
        res.status(400).json({ success: false, message: "enquiryType is required" });
        return;
      }

      const result: any = await this.deleteBillPaymentUseCase.execute(enquiryId, enquiryType, paymentId);

      const clientName = await resolveClientName(enquiryId, enquiryType);
      const invoiceNumber = result?.data?.invoiceNumber || "";

      logAdminAction({
        action: "DELETE",
        module: "BillPayment",
        description: `Payment removed from invoice ${invoiceNumber} (${clientName})`,
        entityId: paymentId,
        entityName: invoiceNumber ? `${invoiceNumber} — ${clientName}` : clientName,
        changes: { currency: result?.data?.currency },
      });

      res.status(200).json(result);
    } catch (error) {
      HandleError.handle(error, res);
    }
  }
}
