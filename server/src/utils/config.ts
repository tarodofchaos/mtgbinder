/**
 * Application Configuration
 *
 * Validates and exports all required environment variables at startup.
 * Throws immediately if any required variable is missing to prevent
 * the server from starting with invalid configuration.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Please check your .env file or environment configuration.`
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function optionalEnvInt(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer`);
  }
  return parsed;
}

// Validate required environment variables at module load time
// This ensures the server fails fast if misconfigured
export const config = {
  // Server
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: optionalEnvInt('PORT', 5000),

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),

  // Authentication - REQUIRED for security
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),

  // CORS
  clientUrl: optionalEnv('CLIENT_URL', 'http://localhost:3000'),

  // Rate limiting
  rateLimitWindowMs: optionalEnvInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: optionalEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),

  // Derived values
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
} as const;

// Type for the config object
export type Config = typeof config;
