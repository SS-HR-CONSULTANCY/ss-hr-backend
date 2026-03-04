import { Router } from "express";
import { AdminEnquiryController } from "../controllers/adminEnquiryController";
import { EnquiryRepositoryImpl } from "../../infrastructure/database/enquiry/enquiryRepositoryImpl";
import { AdminGetAllEnquiriesUseCase, AdminUpdateEnquiryStatusUseCase } from "../../application/adminUse-cases/adminEnquiryUseCases";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

const enquiryRepository = new EnquiryRepositoryImpl();
const getAllEnquiriesUseCase = new AdminGetAllEnquiriesUseCase(enquiryRepository);
const updateEnquiryStatusUseCase = new AdminUpdateEnquiryStatusUseCase(enquiryRepository);
const adminEnquiryController = new AdminEnquiryController(getAllEnquiriesUseCase, updateEnquiryStatusUseCase);

// Apply admin auth middleware to all routes
router.use(authMiddleware);

router.get("/", adminEnquiryController.getAllEnquiries.bind(adminEnquiryController));
router.patch("/:id/status", adminEnquiryController.updateEnquiryStatus.bind(adminEnquiryController));

export default router;
