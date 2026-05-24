import { Router } from 'express';
import { scanQR } from '../controllers/transactions.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/scan', authMiddleware, scanQR);

export default router;