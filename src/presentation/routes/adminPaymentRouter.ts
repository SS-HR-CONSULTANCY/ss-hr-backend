import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminPaymentController } from "../controllers/adminPaymentController";

const router = Router();

router.post("/", authMiddleware, adminPaymentController.createPayment);
router.get("/", authMiddleware, adminPaymentController.getAllPayments);
router.get("/stats", authMiddleware, adminPaymentController.getPaymentStats);
router.get("/customer/:customerId", authMiddleware, adminPaymentController.getPaymentsByCustomer);
router.get("/package/:packageId", authMiddleware, adminPaymentController.getPaymentsByPackage);
router.get("/status/:status", authMiddleware, adminPaymentController.getPaymentsByStatus);
router.get("/graph-data", authMiddleware, adminPaymentController.getPaymentGraphData);
router.get("/:id", authMiddleware, adminPaymentController.getPaymentById);
router.put("/:id", authMiddleware, adminPaymentController.updatePayment);
router.delete("/:id", authMiddleware, adminPaymentController.deletePayment);

export default router;