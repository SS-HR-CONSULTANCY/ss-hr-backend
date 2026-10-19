import { Router } from 'express';
import { importedCustomerController } from '../controllers/importedCustomerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/sync', importedCustomerController.syncCustomers);
router.get('/', authMiddleware, importedCustomerController.getCustomers);
router.get('/staff-stats', authMiddleware, importedCustomerController.getStaffStats);
router.patch('/:id/telecall', authMiddleware, importedCustomerController.updateTelecallStatus);
router.patch('/:id/assign', authMiddleware, importedCustomerController.assignStaff);
router.post('/summarize-comment', authMiddleware, importedCustomerController.summarizeComment);

export default router;
