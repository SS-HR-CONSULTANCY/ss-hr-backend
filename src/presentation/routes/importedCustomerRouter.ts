import { Router } from 'express';
import { importedCustomerController } from '../controllers/importedCustomerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/sync', importedCustomerController.syncCustomers);
router.get('/', authMiddleware, importedCustomerController.getCustomers);
router.patch('/:id/telecall', authMiddleware, importedCustomerController.updateTelecallStatus);
router.patch('/:id/assign', authMiddleware, importedCustomerController.assignStaff);

export default router;
