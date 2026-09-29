import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { AdminLogRepository } from "../../infrastructure/database/adminLog/adminLogRepository";

export const adminLogRouter = Router();
adminLogRouter.use(authMiddleware);

const logRepository = new AdminLogRepository();

// GET /api/admin/logs — paginated list with filters
adminLogRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const module = req.query.module as string | undefined;
    const action = req.query.action as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await logRepository.getAll({ page, limit, module, action, search });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/logs/stats — aggregated stats
adminLogRouter.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await logRepository.getStats();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
