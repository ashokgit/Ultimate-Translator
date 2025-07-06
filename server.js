require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const config = require("./config");
const logger = require("./utils/logger");
const { globalErrorHandler } = require("./utils/errorHandler");
const { requestSizeLimiter } = require("./utils/validation");
const connectDB = require("./db/connect");
const apiRoutes = require("./api/endpoint");
const { initializeConfig } = require("./helpers/stringHelpers");
const path = require("path");
const bodyParser = require("body-parser");

const { translate } = require("@vitalets/google-translate-api");
const TextTranslator = require("./translators/TextTranslator");
const performanceMonitor = require("./utils/performanceMonitor");

const app = express();

// Response compression
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  }
}));

// Enhanced Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      success: false,
      error: {
        type: 'RATE_LIMIT_ERROR',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      }
    });
  }
});

// Speed limiting for API endpoints
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: process.env.NODE_ENV === 'production' ? 50 : 500, // Allow 50 requests per 15 minutes, then...
  delayMs: 500 // Begin adding 500ms of delay per request above 50
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);
app.use('/api/', speedLimiter);

// Setup request logging middleware with performance monitoring
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
    
    // Record performance metrics
    const endpoint = req.route ? req.route.path : req.path;
    performanceMonitor.recordRequest(req.method, endpoint, responseTime, res.statusCode);
  });
  
  next();
});

// Connect to MongoDB
connectDB();

// Initialize translation configuration service
initializeConfig().catch(error => {
  logger.error("Failed to initialize translation configuration", { error: error.message });
});

// Security and validation middleware
app.use(requestSizeLimiter('10mb'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Body parsing middleware with limits
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Define routes
app.use("/api/v1", apiRoutes);

app.get("/make-translate", async (req, res) => {
  const translator = new TextTranslator();
  const response = translator.translate(
    "Non-Alcoholic Concentrated Perfume Oil",
    "fr"
  );
  res.status(200).json(response);
});

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

// Handle unhandled routes
app.use('*', (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

// Export app for testing
module.exports = app;

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const port = config.server.port;
  app.listen(port, () => {
    logger.info("Server started successfully", {
      port: port,
      environment: config.server.nodeEnv,
      defaultTranslator: config.translation.defaultProvider
    });
  });
}
