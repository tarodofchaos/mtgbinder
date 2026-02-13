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
  avatarId: z.string().optional(),
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

const updateSettingsSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  avatarId: z.string().optional(),
  isPublic: z.boolean().optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

const deleteAccountSchema = z.object({
  password: z.string(),
});

router.post('/register', validate(registerSchema), async (req, res: Response, next) => {
  try {
    const { email, password, displayName, avatarId, inviteCode } = req.body;

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
        avatarId,
        isPublic: false, // Explicit default
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        shareCode: true,
        avatarId: true,
        isPublic: true,
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
          avatarId: user.avatarId,
          isPublic: user.isPublic,
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
        avatarId: true,
        isPublic: true,
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

router.put('/me', authMiddleware, validate(updateSettingsSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { displayName, avatarId, isPublic, email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (avatarId !== undefined) updateData.avatarId = avatarId;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Check password if updating sensitive info
    if (email || newPassword) {
      if (!currentPassword) {
        throw new AppError('Current password is required to change email or password', 400);
      }
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid current password', 401);
      }

      if (email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail && existingEmail.id !== user.id) {
          throw new AppError('Email already in use', 400);
        }
        updateData.email = email;
      }

      if (newPassword) {
        updateData.passwordHash = await bcrypt.hash(newPassword, 12);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        shareCode: true,
        avatarId: true,
        isPublic: true,
        createdAt: true,
      },
    });

    res.json({ data: updatedUser, message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/me', authMiddleware, validate(deleteAccountSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid password', 401);
    }

    await prisma.user.delete({ where: { id: req.userId } });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
