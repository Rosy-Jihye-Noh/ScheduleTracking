/**
 * Application Entry Point
 * Express app setup and server startup
 */

// Register path aliases for ts-node
if (process.env.NODE_ENV !== 'production') {
  require('tsconfig-paths/register');
}

import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scheduleRoutes from '@api/routes/schedule.routes';
import trackingRoutes from '@api/routes/tracking.routes';
import { errorHandler, notFoundHandler } from '@api/middleware/errorHandler';

// Load environment variables
dotenv.config();

/**
 * Create Express app
 */
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Schedule Tracking API',
  });
});

// API routes
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/tracking', trackingRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

/**
 * Start server
 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 Schedule API: http://localhost:${PORT}/api/v1/schedules`);
    console.log(`📍 Tracking API: http://localhost:${PORT}/api/v1/tracking`);
  });
}

export default app;

