import {Router} from "express"
import { authMiddleware } from '../middleware/authMiddleware';
import { adminUserController } from "../controllers/adminUserController";

const router = Router();

router.post('/', authMiddleware, adminUserController.createUser);

router.get('/', authMiddleware, adminUserController.getAllUsers);

router.get('/graph-data', authMiddleware, adminUserController.getUserGraphData);

router.get('/stats', authMiddleware, adminUserController.getUserStats);

router.get('/:id', authMiddleware, adminUserController.getUserById);

router.put('/:id', authMiddleware, adminUserController.updateUser);

router.delete('/:id', authMiddleware, adminUserController.deleteUser);

router.get('/details/:id', authMiddleware, adminUserController.getUserFullDetails);

// Overview Routes
router.get("/overview/stats", authMiddleware, adminUserController.getOverviewStats);
router.get("/overview/graph-data", authMiddleware, adminUserController.getOverviewGraphData);
router.get("/overview/comprehensive", authMiddleware, adminUserController.getComprehensiveOverview);

export default router;