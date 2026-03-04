import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminPackageController } from "../controllers/adminPackageController";

const router = Router();

router.get("/public", adminPackageController.getAllPackages);
router.post("/", authMiddleware, adminPackageController.createPackage);
router.get("/", authMiddleware, adminPackageController.getAllPackages);
router.get("/stats", authMiddleware, adminPackageController.getPackageStats);
router.get("/:id", authMiddleware, adminPackageController.getPackageById);
router.put("/:id", authMiddleware, adminPackageController.updatePackage);
router.delete("/:id", authMiddleware, adminPackageController.deletePackage);

export default router;