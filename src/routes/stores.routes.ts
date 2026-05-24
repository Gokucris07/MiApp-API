 import { Router } from 'express';
import { getStores, getStoreById, getStoreRewards } from '../controllers/stores.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getStores);
router.get('/:storeId', authMiddleware, getStoreById);
router.get('/:storeId/rewards', authMiddleware, getStoreRewards);

export default router;
