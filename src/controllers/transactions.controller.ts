import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { calculatePoints, calculateLevel } from '../services/points.service';

export const scanQR = async (req: AuthRequest, res: Response): Promise<void> => {
  const { qr_token } = req.body;

  if (!qr_token) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'qr_token es requerido' });
    return;
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { qr_token },
      include: { store: true }
    });

    if (!transaction) {
      res.status(400).json({ error: 'INVALID_QR', message: 'Código QR no reconocido. ¿Es un ticket de ScanEat?' });
      return;
    }

    if (new Date() > transaction.qr_expires_at) {
      res.status(410).json({ error: 'QR_EXPIRED', message: 'Este QR ha expirado. Pide al cajero que regenere el ticket.' });
      return;
    }

    if (transaction.qr_scanned_at) {
      res.status(409).json({ error: 'ALREADY_USED', message: 'Este QR ya fue utilizado.' });
      return;
    }

    const store = transaction.store;

    if (!store.active) {
      res.status(403).json({ error: 'STORE_INACTIVE', message: 'Este local no tiene el programa activo.' });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: { user_id_store_id: { user_id: req.userId!, store_id: store.id } }
    });

    if (!membership) {
      res.status(404).json({
        error: 'MEMBERSHIP_NOT_FOUND',
        message: 'No tienes membresía en este local',
        store_id: store.id,
        store_name: store.name
      });
      return;
    }

    const points_earned = calculatePoints(transaction.amount_paid, store.pts_per_peso);
    const new_balance = membership.points_balance + points_earned;
    const new_lifetime = membership.points_lifetime + points_earned;
    const old_level = membership.level;
    const new_level = calculateLevel(new_lifetime, {
      silver: store.silver_threshold,
      gold: store.gold_threshold
    });

    const points_expire_at = new Date();
    points_expire_at.setDate(points_expire_at.getDate() + store.points_validity_days);

    await prisma.$transaction([
      prisma.membership.update({
        where: { id: membership.id },
        data: {
          points_balance: new_balance,
          points_lifetime: new_lifetime,
          level: new_level,
          last_transaction_at: new Date(),
          points_expire_at
        }
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          qr_scanned_at: new Date(),
          membership_id: membership.id
        }
      })
    ]);

    res.status(200).json({
      points_earned,
      new_balance,
      store_name: store.name,
      store_id: store.id,
      level_up: old_level !== new_level,
      new_level,
      old_level
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};