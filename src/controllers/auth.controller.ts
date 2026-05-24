 import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthRequest } from '../middlewares/auth.middleware';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Todos los campos son requeridos' });
    return;
  }

  if (password.length < 8) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'La contraseña debe tener al menos 8 caracteres', field: 'password' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'CONFLICT', message: 'Este correo ya está registrado. ¿Quieres iniciar sesión?' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password_hash, full_name, auth_provider: 'email' }
    });

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken(user.id);

    res.status(201).json({ access_token, refresh_token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Correo y contraseña son requeridos' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' });
      return;
    }

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken(user.id);

    res.status(200).json({ access_token, refresh_token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Refresh token requerido' });
    return;
  }

  try {
    const decoded = verifyRefreshToken(refresh_token);
    const access_token = generateAccessToken(decoded.userId);
    res.status(200).json({ access_token });
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sesión expirada. Vuelve a ingresar.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, full_name: true, avatar_url: true, created_at: true }
    });

    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ user });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error del servidor. Intenta de nuevo.' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ message: 'Sesión cerrada correctamente.' });
};
