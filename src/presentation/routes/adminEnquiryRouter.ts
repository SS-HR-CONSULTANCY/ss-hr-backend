import { Router } from "express";
import { AdminEnquiryController } from "../controllers/adminEnquiryController";
import { EnquiryRepositoryImpl } from "../../infrastructure/database/enquiry/enquiryRepositoryImpl";
import { AdminGetAllEnquiriesUseCase, AdminUpdateEnquiryStatusUseCase, AdminDeleteEnquiryUseCase, AdminUpdateEnquiryAccountUseCase, AdminUpdateEnquiryCategoryUseCase, AdminGetEnquiryAnalyticsUseCase, AdminGetEnquiryStatusDistributionUseCase, AdminGetEnquirySummaryStatsUseCase, AdminGetAccountLeadsUseCase } from "../../application/adminUse-cases/adminEnquiryUseCases";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const enquiryRepository = new EnquiryRepositoryImpl();

const getAllEnquiriesUseCase = new AdminGetAllEnquiriesUseCase(enquiryRepository);
const updateEnquiryStatusUseCase = new AdminUpdateEnquiryStatusUseCase(enquiryRepository);
const deleteEnquiryUseCase = new AdminDeleteEnquiryUseCase(enquiryRepository);
const updateEnquiryAccountUseCase = new AdminUpdateEnquiryAccountUseCase(enquiryRepository);
const updateEnquiryCategoryUseCase = new AdminUpdateEnquiryCategoryUseCase(enquiryRepository);
const getEnquiryAnalyticsUseCase = new AdminGetEnquiryAnalyticsUseCase(enquiryRepository);
const getEnquiryStatusDistributionUseCase = new AdminGetEnquiryStatusDistributionUseCase(enquiryRepository);
const getEnquirySummaryStatsUseCase = new AdminGetEnquirySummaryStatsUseCase(enquiryRepository);
const getAccountLeadsUseCase = new AdminGetAccountLeadsUseCase(enquiryRepository);

const adminEnquiryController = new AdminEnquiryController(
  getAllEnquiriesUseCase,
  updateEnquiryStatusUseCase,
  deleteEnquiryUseCase,
  updateEnquiryAccountUseCase,
  updateEnquiryCategoryUseCase,
  getEnquiryAnalyticsUseCase,
  getEnquiryStatusDistributionUseCase,
  getEnquirySummaryStatsUseCase,
  getAccountLeadsUseCase
);

router.get("/", authMiddleware, adminEnquiryController.getAllEnquiries);
router.get("/analytics", authMiddleware, adminEnquiryController.getEnquiryAnalytics);
router.get("/status-distribution", authMiddleware, adminEnquiryController.getEnquiryStatusDistribution);
router.get("/summary-stats", authMiddleware, adminEnquiryController.getEnquirySummaryStats);
router.get("/account/:accountName", authMiddleware, adminEnquiryController.getAccountLeads);
router.patch("/:id/status", authMiddleware, adminEnquiryController.updateEnquiryStatus);
router.patch("/:id/account", authMiddleware, adminEnquiryController.updateEnquiryAccount);
router.patch("/:id/category", authMiddleware, adminEnquiryController.updateEnquiryCategory);
router.delete("/:id", authMiddleware, adminEnquiryController.deleteEnquiry);

export default router;
