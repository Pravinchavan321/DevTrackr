import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import githubRoutes from './routes/github.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import aiRoutes from './routes/ai.routes.js';
import exportRoutes from './routes/export.routes.js';
import engineeringIntelligenceRoutes from './routes/engineeringIntelligence.routes.js';
import errorHandler from './middleware/errorHandler.middleware.js';
import logger from './config/logger.js';

const app = express();

if (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.TRUST_PROXY_HOPS) {
  const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
  app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : 1);
}

const normalizeOrigin = (value) => {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  try {
    return new URL(trimmedValue).origin;
  } catch {
    return trimmedValue.replace(/\/+$/, '');
  }
};

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true
};

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

const captureWebhookRawBody = (req, res, buf) => {
  if (req.originalUrl?.startsWith('/api/github/webhook')) {
    req.rawBody = Buffer.from(buf);
  }
};

// Body parser middleware
app.use(express.json({ limit: '10mb', verify: captureWebhookRawBody }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// HTTP request logging (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/engineering-intelligence', engineeringIntelligenceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: []
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
