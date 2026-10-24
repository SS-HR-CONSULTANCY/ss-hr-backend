import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminTestimonialController } from "../controllers/adminTestimonialController";

const router = Router();

router.post("/", authMiddleware, adminTestimonialController.createTestimonial);
router.post("/sync", authMiddleware, adminTestimonialController.syncGoogleReviews);
router.get("/", authMiddleware, adminTestimonialController.getAllTestimonials);
router.get("/:id", authMiddleware, adminTestimonialController.getTestimonialById);
router.patch("/:id", authMiddleware, adminTestimonialController.updateTestimonial);
router.get("/stats", authMiddleware, adminTestimonialController.getTestimonialStats);
router.delete("/:id", authMiddleware, adminTestimonialController.deleteTestimonial);

export default router;