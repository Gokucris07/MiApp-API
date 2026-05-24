 import { Router } from 'express';
import { generateTicketQR } from '../controllers/tickets.controller';

const router = Router();

router.post('/generate', generateTicketQR);

export default router;
