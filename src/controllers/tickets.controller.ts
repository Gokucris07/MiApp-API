import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { calculatePoints } from '../services/points.service';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

export const generateTicketQR = async (req: Request, res: Response): Promise<void> => {
  const { store_id, ticket_id, total_amount } = req.body;

  if (!store_id || !ticket_id || !total_amount) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'store_id, ticket_id y total_amount son requeridos' });
    return;
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: store_id } });

    if (!store) {
      res.status(404).json({ error: 'STORE_NOT_FOUND', message: 'Local no encontrado' });
      return;
    }

    if (!store.active) {
      res.status(403).json({ error: 'STORE_INACTIVE', message: 'Este local no tiene el programa activo.' });
      return;
    }

    // Anti-duplicados
    const existing = await prisma.transaction.findUnique({ where: { ticket_id } });
    if (existing) {
      const qr_image = await QRCode.toDataURL(existing.qr_token);
      res.status(409).json({
        error: 'DUPLICATE_TICKET',
        qr_token: existing.qr_token,
        qr_image,
        points_value: existing.points_earned,
        expires_at: existing.qr_expires_at
      });
      return;
    }

    const qr_token = uuidv4();
    const qr_expires_at = new Date();
    qr_expires_at.setHours(qr_expires_at.getHours() + store.qr_expiry_hours);
    const points_value = calculatePoints(total_amount, store.pts_per_peso);

    await prisma.transaction.create({
      data: {
        store_id,
        ticket_id,
        qr_token,
        qr_expires_at,
        amount_paid: total_amount,
        points_earned: points_value,
        source: 'pos_api'
      }
    });

    const qr_image = await QRCode.toDataURL(qr_token);

    res.status(200).json({
      qr_token,
      qr_image,
      points_value,
      expires_at: qr_expires_at
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};