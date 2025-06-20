require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const config = require("./config");
const logger = require("./utils/logger");
const { globalErrorHandler } = require("./utils/errorHandler");
const { requestSizeLimiter } = require("./utils/validation");
const connectDB = require("./db/connect");
const apiRoutes = require("./api/endpoint");
const path = require("path");
const bodyParser = require("body-parser");

const { translate } = require("@vitalets/google-translate-api");
const TextTranslator = require("./translators/TextTranslator");

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://code.jquery.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Setup request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });
  
  next();
});

// Connect to MongoDB
connectDB();

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
