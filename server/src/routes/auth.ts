import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { prisma } from '../utils/prisma';
import { config } from '../utils/config';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from '../services/email-service';

const router = Router();
const generateShareCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

router.post('/register', validate(registerSchema), async (req, res: Response, next) => {
  try {
    const { email, password, displayName, inviteCode } = req.body;

    // Registration is strictly restricted. Must have a secret configured AND the invite code must match.
    if (!config.registrationSecret || inviteCode !== config.registrationSecret) {
      logger.warn({ email, hasSecret: !!config.registrationSecret }, 'Registration attempt blocked: missing or invalid invite code');
      throw new AppError('Registration is currently restricted. A valid invite code is required.', 403);
    }

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

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res: Response, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    
    // We don't want to reveal if a user exists or not for security reasons   
    if (!user) {
      res.json({ message: 'If a user with that email exists, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour       

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    
    // Send reset email via Mailjet
    await sendPasswordResetEmail(user.email, user.displayName, resetUrl);     

    res.json({ message: 'If a user with that email exists, a reset link has been sent.' });
  } catch (error) {
    logger.error(error, 'Error in forgot-password');
    // Still send a generic success message to the client
    res.json({ message: 'If a user with that email exists, a reset link has been sent.' });
  }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res: Response, next) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    res.json({ message: 'Password has been reset successfully.' });
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
