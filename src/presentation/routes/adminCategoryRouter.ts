import { Router } from "express";
import { AdminCategoryController } from "../controllers/adminCategoryController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const controller = new AdminCategoryController();

router.use(authMiddleware);

router.post("/", controller.createCategory.bind(controller));
router.get("/", controller.getAllCategories.bind(controller));

export default router;
