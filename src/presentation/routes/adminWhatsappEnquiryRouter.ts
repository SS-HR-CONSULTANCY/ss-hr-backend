import express from "express";
import { AdminWhatsappEnquiryController } from "../controllers/adminWhatsappEnquiryController";
import { 
  AdminCreateWhatsappEnquiryUseCase, 
  AdminGetAllWhatsappEnquiriesUseCase, 
  AdminUpdateWhatsappEnquiryUseCase, 
  AdminUpdateWhatsappEnquiryStatusUseCase, 
  AdminDeleteWhatsappEnquiryUseCase 
} from "../../application/adminUse-cases/adminWhatsappEnquiryUseCases";
import { WhatsappEnquiryRepositoryImpl } from "../../infrastructure/database/whatsappEnquiry/whatsappEnquiryRepositoryImpl";

const adminWhatsappEnquiryRouter = express.Router();

const repository = new WhatsappEnquiryRepositoryImpl();

const createUseCase = new AdminCreateWhatsappEnquiryUseCase(repository);
const getAllUseCase = new AdminGetAllWhatsappEnquiriesUseCase(repository);
const updateUseCase = new AdminUpdateWhatsappEnquiryUseCase(repository);
const updateStatusUseCase = new AdminUpdateWhatsappEnquiryStatusUseCase(repository);
const deleteUseCase = new AdminDeleteWhatsappEnquiryUseCase(repository);

const controller = new AdminWhatsappEnquiryController(
  createUseCase,
  getAllUseCase,
  updateUseCase,
  updateStatusUseCase,
  deleteUseCase
);

adminWhatsappEnquiryRouter.post("/", controller.createEnquiry.bind(controller));
adminWhatsappEnquiryRouter.get("/", controller.getAllEnquiries.bind(controller));
adminWhatsappEnquiryRouter.put("/:id", controller.updateEnquiry.bind(controller));
adminWhatsappEnquiryRouter.patch("/:id/status", controller.updateEnquiryStatus.bind(controller));
adminWhatsappEnquiryRouter.delete("/:id", controller.deleteEnquiry.bind(controller));

export default adminWhatsappEnquiryRouter;
