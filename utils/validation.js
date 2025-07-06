const Joi = require('joi');
const { ValidationError } = require('./errorHandler');
const apiKeyValidations = require('../validations/apiKeyValidate');

// Common validation patterns
const commonPatterns = {
  // Language codes (ISO 639-1 and extended)
  languageCode: Joi.string()
    .min(2)
    .max(10)
    .pattern(/^[a-z]{2,3}(-[A-Z]{2,4})?$/)
    .required()
    .messages({
      'string.pattern.base': 'Language code must be a valid ISO language code (e.g., "en", "en-US", "zh-CN")',
      'string.min': 'Language code must be at least 2 characters',
      'string.max': 'Language code must not exceed 10 characters'
    }),

  // Text content with length limits and sanitization
  translationText: Joi.string()
    .min(1)
    .max(50000) // 50KB limit
    .trim()
    .required()
    .messages({
      'string.min': 'Text cannot be empty',
      'string.max': 'Text exceeds maximum length of 50,000 characters'
    }),

  // URLs with proper validation
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .required()
    .messages({
      'string.uri': 'Must be a valid HTTP or HTTPS URL',
      'string.max': 'URL exceeds maximum length of 2048 characters'
    }),

  // Model names
  modelName: Joi.string()
    .alphanum()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.alphanum': 'Model name can only contain letters and numbers',
      'string.min': 'Model name cannot be empty',
      'string.max': 'Model name exceeds maximum length of 100 characters'
    }),

  // Content IDs
  contentId: Joi.string()
    .alphanum()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.alphanum': 'Content ID can only contain letters and numbers',
      'string.min': 'Content ID cannot be empty',
      'string.max': 'Content ID exceeds maximum length of 100 characters'
    }),

  // JSON strings with validation
  jsonString: Joi.string()
    .max(1000000) // 1MB limit
    .required()
    .custom((value, helpers) => {
      try {
        const parsed = JSON.parse(value);
        // Ensure it's an object, not primitive
        if (typeof parsed !== 'object' || parsed === null) {
          return helpers.error('json.object');
        }
        return value;
      } catch (error) {
        return helpers.error('json.invalid');
      }
    })
    .messages({
      'json.invalid': 'Must be valid JSON',
      'json.object': 'JSON must be an object',
      'string.max': 'JSON exceeds maximum size of 1MB'
    }),

  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

// Schema definitions
const schemas = {
  // String translation validation
  stringTranslation: Joi.object({
    language: commonPatterns.languageCode,
    text: commonPatterns.translationText,
    model_name: commonPatterns.modelName.optional(),
  }).options({ stripUnknown: true }),

  // Page translation validation (query parameters)
  pageTranslation: Joi.object({
    language: commonPatterns.languageCode,
    model_name: commonPatterns.modelName,
    source_url: commonPatterns.url,
    content_id: commonPatterns.contentId,
  }).options({ stripUnknown: true }),

  // Update translation validation
  updateTranslation: Joi.object({
    content_id: commonPatterns.contentId,
    model_name: commonPatterns.modelName,
    language: commonPatterns.languageCode,
    updatedJson: commonPatterns.jsonString,
  }).options({ stripUnknown: true }),

  // Source change validation
  sourceChange: Joi.object({
    content_id: commonPatterns.contentId,
    model_name: commonPatterns.modelName,
    updatedJson: commonPatterns.jsonString,
  }).options({ stripUnknown: true }),

  // Translation URL update validation
  translationUrlUpdate: Joi.object({
    content_id: commonPatterns.contentId,
    model_name: commonPatterns.modelName,
    language: commonPatterns.languageCode,
    new_url: commonPatterns.url,
  }).options({ stripUnknown: true }),

  // Filter validation (query parameters)
  translationFilter: Joi.object({
    language: commonPatterns.languageCode.optional(),
    content_id: commonPatterns.contentId.optional(),
    model_name: commonPatterns.modelName.optional(),
    page: commonPatterns.page,
    limit: commonPatterns.limit,
  }).options({ stripUnknown: true }),

  // Available languages validation (query parameters)
  availableLanguages: Joi.object({
    content_id: commonPatterns.contentId,
    source_url: commonPatterns.url.optional(),
  }).options({ stripUnknown: true }),

  // Delete translation validation
  deleteTranslation: Joi.object({
    content_id: commonPatterns.contentId,
    model_name: commonPatterns.modelName,
    language: commonPatterns.languageCode,
  }).options({ stripUnknown: true }),
};

// Validation middleware factory
const createValidator = (schema, source = 'body') => {
  return (req, res, next) => {
    let data;
    switch (source) {
      case 'query':
        data = req.query;
        break;
      case 'params':
        data = req.params;
        break;
      default:
        data = req.body;
    }
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Type coercion (string to number, etc.)
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      const validationError = new ValidationError(
        'Validation failed',
        details
      );

      return next(validationError);
    }

    // Replace request data with validated/sanitized data
    switch (source) {
      case 'query':
        req.query = value;
        break;
      case 'params':
        req.params = value;
        break;
      default:
        req.body = value;
    }

    next();
  };
};

// Pre-built validators
const validators = {
  stringTranslation: createValidator(schemas.stringTranslation, 'body'),
  pageTranslation: createValidator(schemas.pageTranslation, 'query'),
  updateTranslation: createValidator(schemas.updateTranslation, 'body'),
  sourceChange: createValidator(schemas.sourceChange, 'body'),
  translationUrlUpdate: createValidator(schemas.translationUrlUpdate, 'body'),
  translationFilter: createValidator(schemas.translationFilter, 'query'),
  availableLanguages: createValidator(schemas.availableLanguages, 'query'),
  deleteTranslation: createValidator(schemas.deleteTranslation, 'body'),
  
  // API Key validators
  createApiKey: createValidator(apiKeyValidations.createApiKeySchema, 'body'),
  updateApiKey: createValidator(apiKeyValidations.updateApiKeySchema, 'body'),
  bulkApiKeyOperation: createValidator(apiKeyValidations.bulkOperationSchema, 'body'),
  apiKeyQuery: createValidator(apiKeyValidations.querySchema, 'query'),
  apiKeyId: createValidator(apiKeyValidations.idSchema, 'params'),
};

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim(); // Trim whitespace AFTER removing dangerous content
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

// Request size limiter middleware
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length'));
    const maxSizeBytes = parseFloat(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024);
    
    if (contentLength > maxSizeBytes) {
      const error = new ValidationError(`Request size exceeds limit of ${maxSize}`);
      return next(error);
    }
    
    next();
  };
};

module.exports = {
  commonPatterns,
  schemas,
  validators,
  createValidator,
  sanitizeInput,
  requestSizeLimiter,
}; 