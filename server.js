import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pino from 'pino';
import pinoHttp from 'pino-http';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration with sensible defaults
const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  enableCors: process.env.ENABLE_CORS !== 'false',
  dataFilePath: process.env.DATA_FILE_PATH || path.join(__dirname, 'data', 'app-data.json'),
  contactLogPath: process.env.CONTACT_LOG_PATH || path.join(__dirname, 'logs', 'contact.log')
};

// Ensure logs directory exists
const logsDir = path.dirname(CONFIG.contactLogPath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Structured logger
const logger = pino({ level: CONFIG.logLevel });

// Basic in-memory metrics
const metrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0
};

// Express app
const app = express();

// Security headers
app.use(helmet());

// Compression and JSON parsing
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for API routes
if (CONFIG.enableCors) {
  app.use('/api', cors());
}

// Request logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { method: req.method, url: req.url, id: req.id };
      },
      res(res) {
        return { statusCode: res.statusCode };
      }
    }
  })
);

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: CONFIG.rateLimitWindowMs,
  max: CONFIG.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Simple request counter middleware
app.use((req, res, next) => {
  metrics.requestCount += 1;
  next();
});

// Serve static assets
app.use(express.static(__dirname));

// Helpers
const safeReadJsonFile = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn({ err }, 'Data file missing or invalid. Returning fallback.');
    return { app: { name: 'Sample DevOps App', version: '1.0.0' }, items: [], stats: {} };
  }
};

const writeContactLog = (entry) => {
  try {
    fs.appendFileSync(CONFIG.contactLogPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    logger.error({ err }, 'Failed to write contact log');
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/health', (req, res) => {
  const uptimeSeconds = process.uptime();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds
  });
});

app.get('/api/data', (req, res, next) => {
  try {
    const data = safeReadJsonFile(CONFIG.dataFilePath);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/info', (req, res, next) => {
  try {
    const data = safeReadJsonFile(CONFIG.dataFilePath);
    res.json({ app: data.app, stats: data.stats });
  } catch (err) {
    next(err);
  }
});

// Minimal validation without bringing entire schema lib to client
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidEmail = (value) => /.+@.+\..+/.test(value);

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!isNonEmptyString(name) || !isValidEmail(email) || !isNonEmptyString(message)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const logEntry = {
    type: 'contact',
    at: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    payload: { name, email, message }
  };
  req.log.info(logEntry, 'Contact submission');
  writeContactLog(logEntry);
  return res.status(201).json({ success: true });
});

app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external
    },
    uptime: process.uptime()
  });
});

// 404 handler for API and pages
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  metrics.errorCount += 1;
  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server only if executed directly (not during tests)
let server;
if (process.env.JEST_WORKER_ID === undefined) {
  server = app.listen(CONFIG.port, () => {
    logger.info({ port: CONFIG.port, env: CONFIG.env }, 'Server started');
  });

  const gracefulShutdown = (signal) => {
    logger.info({ signal }, 'Graceful shutdown start');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

export { app };


