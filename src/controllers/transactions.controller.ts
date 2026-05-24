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
    // 1. Buscar la transacción por qr_token
    const transaction = await prisma.transaction.findFirst({
      where: { qr_token },
      include: { membership: { include: { store: true } } }
    });

    if (!transaction) {
      res.status(400).json({ error: 'INVALID_QR', message: 'Código QR no reconocido. ¿Es un ticket de ScanEat?' });
      return;
    }

    // 2. Verificar que no esté expirado
    if (new Date() > transaction.qr_expires_at) {
      res.status(410).json({ error: 'QR_EXPIRED', message: 'Este QR ha expirado. Pide al cajero que regenere el ticket.' });
      return;
    }

    // 3. Verificar que no haya sido usado
    if (transaction.qr_scanned_at) {
      res.status(409).json({ error: 'ALREADY_USED', message: 'Este QR ya fue utilizado.' });
      return;
    }

    const store = transaction.membership.store;

    // 4. Verificar que el store esté activo
    if (!store.active) {
      res.status(403).json({ error: 'STORE_INACTIVE', message: 'Este local no tiene el programa activo.' });
      return;
    }

    // 5. Buscar o crear membresía del usuario en este store
    let membership = await prisma.membership.findUnique({
      where: { user_id_store_id: { user_id: req.userId!, store_id: store.id } }
    });

    if (!membership) {
      res.status(404).json({ error: 'MEMBERSHIP_NOT_FOUND', message: 'No tienes membresía en este local', store_id: store.id, store_name: store.name });
      return;
    }

    // 6. Calcular puntos
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

    // 7. Actualizar todo en una sola transacción DB
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
        data: { qr_scanned_at: new Date() }
      })
    ]);

    const level_up = old_level !== new_level;

    res.status(200).json({
      points_earned,
      new_balance,
      store_name: store.name,
      store_id: store.id,
      level_up,
      new_level,
      old_level
    });

  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};
