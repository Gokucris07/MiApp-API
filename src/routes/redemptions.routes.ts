 import { Router } from 'express';
import { createRedemption, confirmRedemption, getRedemptionHistory } from '../controllers/redemptions.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, createRedemption);
router.post('/:id/confirm', authMiddleware, confirmRedemption);
router.get('/history', authMiddleware, getRedemptionHistory);

export default router;
