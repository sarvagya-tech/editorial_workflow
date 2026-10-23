import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate, requireEditor, requireWriter } from './middleware/auth.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import sectionRoutes from './routes/section.routes.js';
import articleRoutes from './routes/article.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import alertRoutes from './routes/alert.routes.js';
import cronRoutes from './routes/cron.routes.js';
import { startSchedulerWorker, stopSchedulerWorker } from './workers/scheduler.worker.js';

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Editorial Workflow API is running (JavaScript/Express)',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/internal/cron', cronRoutes);

// Role authorization verification endpoints (used by test suites)
app.get('/api/test/editor-only', authenticate, requireEditor, (req, res) => {
  res.json({ access: 'granted', role: req.user.role, user: req.user.name });
});

app.get('/api/test/writer-only', authenticate, requireWriter, (req, res) => {
  res.json({ access: 'granted', role: req.user.role, user: req.user.name });
});

// Centralized error handler
app.use(errorHandler);

// Only listen if run directly (allows importing in tests)
if (process.env.NODE_ENV !== 'test') {
  const PORT = config.port;
  const server = app.listen(PORT, () => {
    console.log(`[Editorial API] Server running on http://localhost:${PORT}`);

    // Autonomous scheduled publishing background worker
    if (config.enableSchedulerWorker) {
      startSchedulerWorker({ intervalMs: config.schedulerIntervalMs });
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Editorial API] Initiating graceful shutdown...');
    stopSchedulerWorker();
    server.close(() => {
      console.log('[Editorial API] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
