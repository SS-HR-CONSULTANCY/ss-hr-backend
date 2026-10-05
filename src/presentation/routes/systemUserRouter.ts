import { Router } from 'express';
import { systemUserController } from '../controllers/systemUserController';

const router = Router();

router.get('/', systemUserController.getUsers);
router.post('/', systemUserController.createUser);
router.patch('/:id', systemUserController.updateUser);
router.delete('/:id', systemUserController.deleteUser);

export default router;
