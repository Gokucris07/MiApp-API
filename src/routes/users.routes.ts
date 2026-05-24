import { Router } from 'express';
import { updateProfile, deleteAccount, getTransactionHistory } from '../controllers/users.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.patch('/me', authMiddleware, updateProfile);
router.delete('/me', authMiddleware, deleteAccount);
router.get('/me/transactions', authMiddleware, getTransactionHistory);

export default router;
