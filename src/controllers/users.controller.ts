import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { full_name, avatar_url, push_token } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(full_name && { full_name }),
        ...(avatar_url && { avatar_url }),
        ...(push_token && { push_token }),
        updated_at: new Date()
      },
      select: { id: true, email: true, full_name: true, avatar_url: true }
    });
    res.status(200).json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.membership.updateMany({
      where: { user_id: req.userId! },
      data: { active: false }
    });
    res.status(200).json({ message: 'Cuenta eliminada correctamente.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { store_id, limit = '20', offset = '0' } = req.query;

    const memberships = await prisma.membership.findMany({
      where: {
        user_id: req.userId!,
        ...(store_id ? { store_id: String(store_id) } : {})
      },
      select: { id: true }
    });

    const membershipIds = memberships.map(m => m.id);

    const transactions = await prisma.transaction.findMany({
      where: { membership_id: { in: membershipIds } },
      orderBy: { created_at: 'desc' },
      take: parseInt(String(limit)),
      skip: parseInt(String(offset)),
      include: { store: { select: { name: true, logo_url: true } } }
    });

    res.status(200).json({ transactions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};
