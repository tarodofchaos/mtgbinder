import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { validateQuery } from '../middleware/validate';

const router = Router();

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('20'),
  unreadOnly: z.string().transform((val) => val === 'true').default('false'),
});

router.use(authMiddleware);

// GET /api/notifications - Get user's notifications
router.get('/', validateQuery(listQuerySchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { page, pageSize, unreadOnly } = req.query as unknown as {
      page: number;
      pageSize: number;
      unreadOnly: boolean;
    };

    const where: Record<string, unknown> = { userId: req.userId };

    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          card: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: req.userId,
          read: false,
        },
      }),
    ]);

    res.json({
      data: notifications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
        read: false,
      },
    });

    res.json({ data: { unreadCount } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existingNotification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingNotification) {
      throw new AppError('Notification not found', 404);
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
      include: { card: true },
    });

    res.json({ data: notification });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      message: 'All notifications marked as read',
      data: { count: result.count },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existingNotification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingNotification) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as notificationsRouter };
