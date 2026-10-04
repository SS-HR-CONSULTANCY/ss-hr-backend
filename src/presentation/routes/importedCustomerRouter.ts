import { Router } from 'express';
import { importedCustomerController } from '../controllers/importedCustomerController';

const router = Router();

router.post('/sync', importedCustomerController.syncCustomers);
router.get('/', importedCustomerController.getCustomers);

export default router;
