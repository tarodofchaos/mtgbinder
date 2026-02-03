import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { prisma } from '../utils/prisma';
import { config } from '../utils/config';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();
const generateShareCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', validate(registerSchema), async (req, res: Response, next) => {
  try {
    const { email, password, displayName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const shareCode = generateShareCode();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        shareCode,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        shareCode: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.status(201).json({
      data: { user, token },
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res: Response, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          shareCode: user.shareCode,
          createdAt: user.createdAt,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        shareCode: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

router.put('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { displayName } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { displayName },
      select: {
        id: true,
        email: true,
        displayName: true,
        shareCode: true,
        createdAt: true,
      },
    });

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
