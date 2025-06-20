const logger = require('./logger');

// Standard error response format
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Predefined error types
class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(400, message);
    this.type = 'VALIDATION_ERROR';
    this.details = details;
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`);
    this.type = 'NOT_FOUND_ERROR';
  }
}

class ConflictError extends ApiError {
  constructor(message) {
    super(409, message);
    this.type = 'CONFLICT_ERROR';
  }
}

class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message);
    this.type = 'INTERNAL_SERVER_ERROR';
  }
}

class TranslationError extends ApiError {
  constructor(provider, message = 'Translation failed') {
    super(503, `${provider} translation service error: ${message}`);
    this.type = 'TRANSLATION_ERROR';
    this.provider = provider;
  }
}

class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(429, message);
    this.type = 'RATE_LIMIT_ERROR';
  }
}

// Standardized response formatter
const formatErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    error: {
      type: error.type || 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString(),
    }
  };

  // Add details for validation errors
  if (error.details) {
    response.error.details = error.details;
  }

  // Add provider info for translation errors
  if (error.provider) {
    response.error.provider = error.provider;
  }

  // Include stack trace in development
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

// Global error handler middleware
const globalErrorHandler = (error, req, res, next) => {
  let err = error;

  // Convert non-ApiError errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Something went wrong';
    err = new ApiError(statusCode, message, false, error.stack);
  }

  // Log error
  logger.error('Request error', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      type: err.type || 'UNKNOWN_ERROR',
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
    },
    requestBody: req.body ? JSON.stringify(req.body).substring(0, 1000) : null,
    requestQuery: req.query,
  });

  // Send error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = formatErrorResponse(err, isDevelopment);
  
  res.status(err.statusCode).json(response);
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Success response formatter
const successResponse = (data, message = 'Success', meta = null) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
};

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  TranslationError,
  RateLimitError,
  formatErrorResponse,
  globalErrorHandler,
  asyncHandler,
  successResponse,
}; 