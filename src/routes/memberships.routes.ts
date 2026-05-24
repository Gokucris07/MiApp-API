import { Router } from 'express';
import { getMemberships, getMembershipByStore, joinStore } from '../controllers/memberships.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMemberships);
router.get('/:storeId', authMiddleware, getMembershipByStore);
router.post('/', authMiddleware, joinStore);

export default router;