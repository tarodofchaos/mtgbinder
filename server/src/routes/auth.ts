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
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  locale: z.string().optional(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const updateSettingsSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  avatarId: z.string().optional(),
  bannerTheme: z.string().optional(),
  isPublic: z.boolean().optional(),
  autoAddBoughtCards: z.boolean().optional(),
  tutorialProgress: z.record(z.boolean()).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

const deleteAccountSchema = z.object({
  password: z.string(),
});

router.post('/register', validate(registerSchema), async (req, res: Response, next) => {
  try {
    const { email: rawEmail, password, displayName, avatarId } = req.body;
    const email = rawEmail.toLowerCase();

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
        bannerTheme: true,
        isPublic: true,
        autoAddBoughtCards: true,
        tutorialProgress: true,
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
    const { email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase();

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
          bannerTheme: user.bannerTheme,
          isPublic: user.isPublic,
          autoAddBoughtCards: user.autoAddBoughtCards,
          tutorialProgress: user.tutorialProgress as Record<string, boolean>,
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

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res: Response) => {
  try {
    const { email: rawEmail, locale: bodyLocale } = req.body;
    const email = rawEmail.toLowerCase();
    
    // Detect locale: 1. body, 2. Accept-Language header, 3. default 'en'
    const acceptLanguage = req.headers['accept-language'];
    const headerLocale = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0] : 'en';
    const locale = bodyLocale || headerLocale || 'en';

    const user = await prisma.user.findUnique({ where: { email } });
    
    // We don't want to reveal if a user exists or not for security reasons   
    if (!user) {
      res.json({ message: 'If a user with that email exists, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour       

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpires,
      },
    });

    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    
    // Send reset email
    await sendPasswordResetEmail(user.email, user.displayName, resetUrl, locale);     

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
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
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
        bannerTheme: true,
        isPublic: true,
        autoAddBoughtCards: true,
        tutorialProgress: true,
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
    const { displayName, avatarId, bannerTheme, isPublic, autoAddBoughtCards, tutorialProgress, email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (avatarId !== undefined) updateData.avatarId = avatarId;
    if (bannerTheme !== undefined) updateData.bannerTheme = bannerTheme;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (autoAddBoughtCards !== undefined) updateData.autoAddBoughtCards = autoAddBoughtCards;
    
    if (tutorialProgress !== undefined) {
      if (Object.keys(tutorialProgress).length === 0) {
        // Explicitly reset if empty object provided
        updateData.tutorialProgress = {};
      } else {
        // Merge with existing progress
        const existingProgress = (user.tutorialProgress as Record<string, boolean>) || {};
        updateData.tutorialProgress = { ...existingProgress, ...tutorialProgress };
      }
    }

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
        const normalizedEmail = email.toLowerCase();
        const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingEmail && existingEmail.id !== user.id) {
          throw new AppError('Email already in use', 400);
        }
        updateData.email = normalizedEmail;
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
        bannerTheme: true,
        isPublic: true,
        autoAddBoughtCards: true,
        tutorialProgress: true,
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
