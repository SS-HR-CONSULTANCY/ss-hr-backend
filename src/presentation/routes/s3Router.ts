import express from "express";
import { localFileController } from "../controllers/s3Controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { uploadSettings } from "../../infrastructure/middleware/multerMiddleware";

const router = express.Router();

router.post("/upload", authMiddleware, uploadSettings.single("file"), localFileController.uploadFile);

router.delete("/", authMiddleware, localFileController.deleteFile);

export default router;
