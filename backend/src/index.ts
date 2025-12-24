import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeXRPLClient } from './xrpl/client';
import { initializeDatabase } from './db';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import gigsRoutes from './routes/gigs';
import paymentsRoutes from './routes/payments';
import escrowsRoutes from './routes/escrows';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'RippleFreelance API',
    version: '0.1.0',
    description: 'Cross-border gig economy platform powered by XRPL',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/gigs', gigsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/escrows', escrowsRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize XRPL client and start server
async function start() {
  try {
    // Initialize database
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      logger.info('Initializing database connection...');
      initializeDatabase(databaseUrl);
      logger.info('Database connected successfully');
    } else {
      logger.warn('DATABASE_URL not set - database features disabled');
    }

    // Initialize XRPL connection
    const networkUrl = process.env.XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233';
    const walletSeed = process.env.XRPL_WALLET_SEED;

    logger.info('Initializing XRPL client...');
    const xrplClient = initializeXRPLClient(networkUrl, walletSeed);
    await xrplClient.connect();
    logger.info('XRPL client connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 RippleFreelance backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`XRPL Network: ${networkUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  const { getXRPLClient } = await import('./xrpl/client');
  const { closeDatabase } = await import('./db');
  await getXRPLClient().disconnect();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  const { getXRPLClient } = await import('./xrpl/client');
  const { closeDatabase } = await import('./db');
  await getXRPLClient().disconnect();
  await closeDatabase();
  process.exit(0);
});

// Start the server
start();
