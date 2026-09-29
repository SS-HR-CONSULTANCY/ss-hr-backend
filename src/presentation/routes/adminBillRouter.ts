import { Router } from "express";
import { AdminBillController } from "../controllers/adminBillController";
import { 
  AdminGetBillsUseCase, 
  AdminUpdateBillUseCase, 
  AdminAddBillPaymentUseCase,
  AdminUpdateBillPaymentUseCase,
  AdminDeleteBillPaymentUseCase
} from "../../application/adminUse-cases/adminBillUseCases";
import { BillRepositoryImpl } from "../../infrastructure/database/bill/billRepositoryImpl";
import { authMiddleware } from "../middleware/authMiddleware";

export const adminBillRouter = Router();

const billRepository = new BillRepositoryImpl();

const getBillsUseCase = new AdminGetBillsUseCase(billRepository);
const updateBillUseCase = new AdminUpdateBillUseCase(billRepository);
const addBillPaymentUseCase = new AdminAddBillPaymentUseCase(billRepository);
const updateBillPaymentUseCase = new AdminUpdateBillPaymentUseCase(billRepository);
const deleteBillPaymentUseCase = new AdminDeleteBillPaymentUseCase(billRepository);

const adminBillController = new AdminBillController(
  getBillsUseCase,
  updateBillUseCase,
  addBillPaymentUseCase,
  updateBillPaymentUseCase,
  deleteBillPaymentUseCase
);

adminBillRouter.use(authMiddleware);

adminBillRouter.get("/", adminBillController.getBills);
adminBillRouter.patch("/:enquiryId", adminBillController.updateBill);
adminBillRouter.post("/:enquiryId/payments", adminBillController.addPayment);
adminBillRouter.patch("/:enquiryId/payments/:paymentId", adminBillController.updatePayment);
adminBillRouter.delete("/:enquiryId/payments/:paymentId", adminBillController.deletePayment);

