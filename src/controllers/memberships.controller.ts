import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { calculateLevel } from '../services/points.service';

export const getMemberships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { user_id: req.userId!, active: true },
      include: {
        store: {
          select: {
            id: true, name: true, logo_url: true, category: true,
            silver_threshold: true, gold_threshold: true, pts_per_peso: true
          }
        }
      },
      orderBy: { last_transaction_at: 'desc' }
    });
    res.status(200).json({ memberships });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const getMembershipByStore = async (req: AuthRequest, res: Response): Promise<void> => {
    const storeId = String(req.params.storeId);
  try {
    const membership = await prisma.membership.findUnique({
      where: { user_id_store_id: { user_id: req.userId!, store_id: storeId } },
      include: {
        store: {
          select: {
            id: true, name: true, logo_url: true, silver_threshold: true,
            gold_threshold: true, pts_per_peso: true, points_validity_days: true
          }
        }
      }
    });
    if (!membership) {
      res.status(404).json({ error: 'MEMBERSHIP_NOT_FOUND', message: 'No tienes membresía en este local' });
      return;
    }
    res.status(200).json({ membership });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const joinStore = async (req: AuthRequest, res: Response): Promise<void> => {
  const { store_id } = req.body;

  if (!store_id) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'store_id es requerido' });
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

    const existing = await prisma.membership.findUnique({
      where: { user_id_store_id: { user_id: req.userId!, store_id } }
    });
    if (existing) {
      res.status(200).json({ membership: existing, message: 'Ya eres miembro de este local' });
      return;
    }

    const points_expire_at = new Date();
    points_expire_at.setDate(points_expire_at.getDate() + store.points_validity_days);

    const membership = await prisma.membership.create({
      data: {
        user_id: req.userId!,
        store_id,
        points_expire_at,
        level: 'bronze'
      }
    });

    res.status(201).json({ membership });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};
