import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { initializeSocket } from './services/socket-service';

// Routes
import { authRouter } from './routes/auth';
import { cardsRouter } from './routes/cards';
import { collectionRouter } from './routes/collection';
import { wishlistRouter } from './routes/wishlist';
import { tradeRouter } from './routes/trade';
import { binderRouter } from './routes/binder';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initializeSocket(httpServer);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/binder', binderRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

export { app, httpServer };
