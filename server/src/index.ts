import 'dotenv/config';

// Import config first to validate environment variables immediately
// This ensures the server fails fast if required variables are missing
import { config } from './utils/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { createServer } from 'http';
import path from 'path';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { initializeSocket } from './services/socket-service';
import { startPriceCheckScheduler } from './services/price-check-service';

// Routes
import { authRouter } from './routes/auth';
import { cardsRouter } from './routes/cards';
import { collectionRouter } from './routes/collection';
import { wishlistRouter } from './routes/wishlist';
import { tradeRouter } from './routes/trade';
import { binderRouter } from './routes/binder';
import { importRouter } from './routes/import';
import { notificationsRouter } from './routes/notifications';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Start price check scheduler (checks every 6 hours)
const priceCheckInterval = startPriceCheckScheduler();

// Request logging middleware
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} completed with ${res.statusCode}`;
    },
    customErrorMessage: (req, res) => {
      return `${req.method} ${req.url} failed with ${res.statusCode}`;
    },
  })
);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https://cards.scryfall.io', 'https://api.scryfall.com'],
            connectSrc: ["'self'", 'wss:', 'ws:', 'https://cards.scryfall.io', 'https://api.scryfall.com'],
            upgradeInsecureRequests: null, // Disable HTTPS upgrade for HTTP deployments
          },
        }
      : false,
    crossOriginOpenerPolicy: false, // Disable COOP for simpler setup
    crossOriginEmbedderPolicy: false, // Disable COEP to allow loading external images
    crossOriginResourcePolicy: false, // Disable CORP to allow cross-origin resources
  })
);
app.use(
  cors({
    origin: config.isProduction ? true : config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => req.path === '/health', // Don't rate limit health checks
});

// Stricter rate limit for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isDevelopment ? 1000 : 20, // Higher limit for dev
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check (before rate limiting)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded images
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/binder', binderRouter);
app.use('/api/import', importRouter);
app.use('/api/notifications', notificationsRouter);

// Static file serving for production (serves React frontend)
if (config.isProduction) {
  const clientDistPath = path.join(__dirname, '../../../client/dist');
  app.use(express.static(clientDistPath));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  clearInterval(priceCheckInterval);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
httpServer.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
      clientUrl: config.clientUrl,
    },
    'Server started'
  );
});

export { app, httpServer };
