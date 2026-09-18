import { Router } from "express";
import { AdminEnquiryController } from "../controllers/adminEnquiryController";
import { EnquiryRepositoryImpl } from "../../infrastructure/database/enquiry/enquiryRepositoryImpl";
import { AdminGetAllEnquiriesUseCase, AdminUpdateEnquiryStatusUseCase, AdminDeleteEnquiryUseCase, AdminUpdateEnquiryAccountUseCase, AdminUpdateEnquiryCategoryUseCase, AdminGetEnquiryAnalyticsUseCase } from "../../application/adminUse-cases/adminEnquiryUseCases";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

const enquiryRepository = new EnquiryRepositoryImpl();
const getAllEnquiriesUseCase = new AdminGetAllEnquiriesUseCase(enquiryRepository);
const updateEnquiryStatusUseCase = new AdminUpdateEnquiryStatusUseCase(enquiryRepository);
const deleteEnquiryUseCase = new AdminDeleteEnquiryUseCase(enquiryRepository);
const updateEnquiryAccountUseCase = new AdminUpdateEnquiryAccountUseCase(enquiryRepository);
const updateEnquiryCategoryUseCase = new AdminUpdateEnquiryCategoryUseCase(enquiryRepository);
const getEnquiryAnalyticsUseCase = new AdminGetEnquiryAnalyticsUseCase(enquiryRepository);
const adminEnquiryController = new AdminEnquiryController(getAllEnquiriesUseCase, updateEnquiryStatusUseCase, deleteEnquiryUseCase, updateEnquiryAccountUseCase, updateEnquiryCategoryUseCase, getEnquiryAnalyticsUseCase);

// Apply admin auth middleware to all routes
router.use(authMiddleware);

router.get("/analytics", adminEnquiryController.getEnquiryAnalytics);

router.get("/", adminEnquiryController.getAllEnquiries);
router.patch("/:id/status", adminEnquiryController.updateEnquiryStatus);
router.patch("/:id/account", adminEnquiryController.updateEnquiryAccount);
router.patch("/:id/category", adminEnquiryController.updateEnquiryCategory);
router.delete("/:id", adminEnquiryController.deleteEnquiry);

export default router;

