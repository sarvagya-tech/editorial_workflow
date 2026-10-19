import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate, requireEditor, requireWriter } from './middleware/auth.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import sectionRoutes from './routes/section.routes.js';
import articleRoutes from './routes/article.routes.js';

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
  app.listen(PORT, () => {
    console.log(`[Editorial API] Server running on http://localhost:${PORT}`);
  });
}

export default app;
