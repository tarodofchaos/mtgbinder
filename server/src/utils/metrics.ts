import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge } from 'prom-client';
import { prisma } from './prisma';
import { logger } from './logger';

// Create a Registry which registers the metrics
const register = new Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'mtg-binder-server',
});

// Enable the collection of default metrics
collectDefaultMetrics({ register });

// Custom HTTP metrics
export const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
  registers: [register],
});

// Custom Prisma metrics
export const prismaQueryDuration = new Histogram({
  name: 'prisma_query_duration_seconds',
  help: 'Duration of Prisma queries in seconds',
  labelNames: ['model', 'action'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Business Metrics
export const tradeMatchesTotal = new Counter({
  name: 'mtg_trade_matches_total',
  help: 'Total number of trade matches computed',
  registers: [register],
});

export const priceAlertsTotal = new Counter({
  name: 'mtg_price_alerts_total',
  help: 'Total number of price alerts created',
  registers: [register],
});

export const activeSocketConnections = new Gauge({
  name: 'mtg_active_socket_connections',
  help: 'Number of active Socket.IO connections',
  registers: [register],
});

/**
 * Gets the metrics in Prometheus format
 */
export async function getMetrics() {
  try {
    // Collect Prisma metrics if available
    const prismaMetrics = await prisma.$metrics.prometheus();
    const appMetrics = await register.metrics();
    
    return appMetrics + '\n' + prismaMetrics;
  } catch (error) {
    logger.error({ error }, 'Error collecting metrics');
    return register.metrics();
  }
}

export { register };
