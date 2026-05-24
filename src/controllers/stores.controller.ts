import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getStores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category } = req.query;
    const stores = await prisma.store.findMany({
      where: {
        active: true,
        ...(search && { name: { contains: String(search), mode: 'insensitive' } }),
        ...(category && { category: String(category) }),
      },
      select: { id: true, name: true, logo_url: true, category: true, address: true }
    });
    res.status(200).json({ stores });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const getStoreById = async (req: AuthRequest, res: Response): Promise<void> => {
  const storeId = String(req.params.storeId);
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true, name: true, logo_url: true, category: true,
        address: true, pts_per_peso: true, bronze_threshold: true,
        silver_threshold: true, gold_threshold: true,
        points_validity_days: true, active: true
      }
    });
    if (!store) {
      res.status(404).json({ error: 'STORE_NOT_FOUND', message: 'Local no encontrado' });
      return;
    }
    res.status(200).json({ store });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const getStoreRewards = async (req: AuthRequest, res: Response): Promise<void> => {
  const storeId = String(req.params.storeId);
  try {
    const rewards = await prisma.reward.findMany({
      where: { store_id: storeId, active: true },
      select: {
        id: true, name: true, description: true, image_url: true,
        points_cost: true, min_level: true, stock: true, expires_at: true
      }
    });
    res.status(200).json({ rewards });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};