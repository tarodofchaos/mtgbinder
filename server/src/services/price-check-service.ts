import { NotificationType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { emitToUser } from './socket-service';
import { priceAlertsTotal } from '../utils/metrics';

interface PriceDropAlert {
  userId: string;
  cardId: string;
  cardName: string;
  oldPrice: number;
  newPrice: number;
}

/**
 * Check all wishlist items with maxPrice set against current card prices
 * Creates alerts and emits socket events when prices drop below maxPrice
 */
export async function checkWishlistPrices(): Promise<number> {
  try {
    logger.info('Starting wishlist price check');

    // Find all wishlist items with maxPrice set
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        maxPrice: {
          not: null,
        },
      },
      include: {
        card: true,
      },
    });

    if (wishlistItems.length === 0) {
      logger.info('No wishlist items with maxPrice set');
      return 0;
    }

    const alerts: PriceDropAlert[] = [];

    // Check each wishlist item
    for (const item of wishlistItems) {
      const { card, maxPrice, userId, foilOnly } = item;

      // Skip if no maxPrice (should not happen due to where clause, but type safety)
      if (maxPrice === null) continue;

      // Determine which price to check based on foilOnly preference
      const currentPrice = foilOnly ? card.priceEurFoil : card.priceEur;

      // Skip if no current price available
      if (currentPrice === null) continue;

      // Check if price has dropped below maxPrice
      if (currentPrice <= maxPrice) {
        // Check if we already have a recent alert for this card/user combo
        const existingAlert = await prisma.notification.findFirst({
          where: {
            userId,
            cardId: card.id,
            type: NotificationType.PRICE_ALERT,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
          },
        });

        // Only create alert if no recent alert exists
        if (!existingAlert) {
          alerts.push({
            userId,
            cardId: card.id,
            cardName: card.name,
            oldPrice: maxPrice,
            newPrice: currentPrice,
          });
        }
      }
    }

    // Create alerts in database and emit socket events
    for (const alert of alerts) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: alert.userId,
            cardId: alert.cardId,
            type: NotificationType.PRICE_ALERT,
            title: 'Price Drop Alert',
            message: `The price for ${alert.cardName} has dropped below your limit!`,
            data: {
              oldPrice: alert.oldPrice,
              newPrice: alert.newPrice,
            },
          },
          include: {
            card: true,
          },
        });

        // Increment Prometheus counter
        priceAlertsTotal.inc();

        // Emit socket event to user
        emitToUser(alert.userId, 'notification', {
          ...notification,
          data: notification.data || {},
        });

        logger.info(
          {
            userId: alert.userId,
            cardName: alert.cardName,
            oldPrice: alert.oldPrice,
            newPrice: alert.newPrice
          },
          'Price alert notification created'
        );
      } catch (error) {
        logger.error({ error, alert }, 'Failed to create price alert notification');
      }
    }

    logger.info({ alertsCreated: alerts.length }, 'Wishlist price check completed');
    return alerts.length;
  } catch (error) {
    logger.error({ error }, 'Error during wishlist price check');
    throw error;
  }
}

/**
 * Schedule price checks to run periodically
 * Default: every 6 hours
 */
export function startPriceCheckScheduler(intervalMs: number = 6 * 60 * 60 * 1000): NodeJS.Timeout {
  logger.info({ intervalMs }, 'Starting price check scheduler');

  // Run immediately on startup
  checkWishlistPrices().catch((error) => {
    logger.error({ error }, 'Initial price check failed');
  });

  // Then run periodically
  const interval = setInterval(() => {
    checkWishlistPrices().catch((error) => {
      logger.error({ error }, 'Scheduled price check failed');
    });
  }, intervalMs);

  return interval;
}
