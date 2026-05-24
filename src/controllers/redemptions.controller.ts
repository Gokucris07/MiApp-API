import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

export const createRedemption = async (req: AuthRequest, res: Response): Promise<void> => {
  const { reward_id } = req.body;

  if (!reward_id) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'reward_id es requerido' });
    return;
  }

  try {
    const reward = await prisma.reward.findUnique({ where: { id: reward_id } });

    if (!reward) {
      res.status(404).json({ error: 'REWARD_NOT_FOUND', message: 'Este premio ya no está disponible.' });
      return;
    }

    if (!reward.active) {
      res.status(404).json({ error: 'REWARD_NOT_FOUND', message: 'Este premio ya no está disponible.' });
      return;
    }

    if (reward.stock !== null && reward.stock <= 0) {
      res.status(422).json({ error: 'REWARD_OUT_OF_STOCK', message: 'Este premio se agotó.' });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: { user_id_store_id: { user_id: req.userId!, store_id: reward.store_id } }
    });

    if (!membership) {
      res.status(404).json({ error: 'MEMBERSHIP_NOT_FOUND', message: 'No tienes membresía en este local' });
      return;
    }

    if (membership.points_balance < reward.points_cost) {
      res.status(403).json({ error: 'INSUFFICIENT_POINTS', message: 'No tienes suficientes puntos para canjear.' });
      return;
    }

    const levelOrder: Record<string, number> = { bronze: 0, silver: 1, gold: 2 };
    if (levelOrder[membership.level] < levelOrder[reward.min_level]) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Tu nivel no es suficiente para este premio.' });
      return;
    }

    const qr_token = uuidv4();
    const qr_expires_at = new Date();
    qr_expires_at.setMinutes(qr_expires_at.getMinutes() + 10);

    await prisma.$transaction([
      prisma.membership.update({
        where: { id: membership.id },
        data: { points_balance: membership.points_balance - reward.points_cost }
      }),
      prisma.redemption.create({
        data: {
          membership_id: membership.id,
          reward_id,
          qr_token,
          qr_expires_at,
          points_deducted: reward.points_cost
        }
      }),
      ...(reward.stock !== null ? [prisma.reward.update({
        where: { id: reward_id },
        data: { stock: reward.stock - 1 }
      })] : [])
    ]);

    res.status(201).json({ qr_token, qr_expires_at, reward_name: reward.name, points_deducted: reward.points_cost });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const confirmRedemption = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = String(req.params.id);

  try {
    const redemption = await prisma.redemption.findUnique({ where: { id } });

    if (!redemption) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Canje no encontrado' });
      return;
    }

    if (redemption.confirmed_at) {
      res.status(409).json({ error: 'ALREADY_USED', message: 'Este canje ya fue confirmado.' });
      return;
    }

    if (new Date() > redemption.qr_expires_at) {
      await prisma.membership.update({
        where: { id: redemption.membership_id },
        data: { points_balance: { increment: redemption.points_deducted } }
      });
      res.status(410).json({ error: 'QR_EXPIRED', message: 'Este QR ha expirado. Los puntos fueron devueltos.' });
      return;
    }

    await prisma.redemption.update({
      where: { id },
      data: { confirmed_at: new Date(), confirmed_by: req.userId }
    });

    res.status(200).json({ message: 'Entrega confirmada correctamente.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const getRedemptionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { store_id } = req.query;
    const redemptions = await prisma.redemption.findMany({
      where: {
        membership: {
          user_id: req.userId!,
          ...(store_id ? { store_id: String(store_id) } : {})
        }
      },
      include: { reward: { select: { name: true, image_url: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json({ redemptions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};
