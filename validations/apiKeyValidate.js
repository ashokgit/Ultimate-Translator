const Joi = require("joi");

// Common validation patterns for API keys
const apiKeyPatterns = {
  // Provider validation
  provider: Joi.string()
    .valid('openai', 'huggingface', 'google', 'custom')
    .required()
    .messages({
      'any.only': 'Provider must be one of: openai, huggingface, google, custom',
      'any.required': 'Provider is required'
    }),

  // API key validation (basic format check)
  apiKey: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'API key must be at least 10 characters long',
      'string.max': 'API key cannot exceed 1000 characters',
      'any.required': 'API key is required'
    }),

  // Name validation
  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Name cannot be empty',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  // Description validation
  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  // Configuration validation
  config: Joi.object({
    model: Joi.string().max(100).valid(
      'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.5', 'gpt-4', 'gpt-3.5-turbo'
    ).optional().messages({
      'any.only': 'Invalid OpenAI model. Valid models are: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4.5, gpt-4, gpt-3.5-turbo'
    }),
    maxTokens: Joi.number().integer().min(1).max(100000).optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    apiUrl: Joi.string().uri().optional(),
    proxies: Joi.array().items(Joi.string().uri()).optional()
  }).optional(),

  // Available models validation (for OpenAI)
  availableModels: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().optional(),
      maxTokens: Joi.number().integer().min(1).optional(),
      pricing: Joi.object({
        input: Joi.number().min(0).optional(),
        output: Joi.number().min(0).optional()
      }).optional()
    })
  ).optional(),

  // Rate limiting validation
  rateLimit: Joi.object({
    requestsPerMinute: Joi.number().integer().min(1).max(10000).optional(),
    requestsPerHour: Joi.number().integer().min(1).max(100000).optional(),
    requestsPerDay: Joi.number().integer().min(1).max(1000000).optional()
  }).optional(),

  // Quota validation
  quota: Joi.object({
    totalRequests: Joi.number().integer().min(1).optional(),
    resetDate: Joi.date().optional()
  }).optional(),

  // Expiration date validation
  expiresAt: Joi.date()
    .greater('now')
    .optional()
    .messages({
      'date.greater': 'Expiration date must be in the future'
    }),

  // Boolean flags
  isActive: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional()
};

// Schema for creating API keys
const createApiKeySchema = Joi.object({
  provider: apiKeyPatterns.provider,
  name: apiKeyPatterns.name,
  description: apiKeyPatterns.description,
  apiKey: apiKeyPatterns.apiKey,
  config: apiKeyPatterns.config,
  isDefault: apiKeyPatterns.isDefault,
  expiresAt: apiKeyPatterns.expiresAt,
  rateLimit: apiKeyPatterns.rateLimit,
  quota: apiKeyPatterns.quota
}).options({ stripUnknown: true });

// Schema for updating API keys
const updateApiKeySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Name cannot be empty',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  description: apiKeyPatterns.description,
  apiKey: Joi.string()
    .min(10)
    .max(1000)
    .optional()
    .messages({
      'string.min': 'API key must be at least 10 characters long',
      'string.max': 'API key cannot exceed 1000 characters'
    }),
  config: apiKeyPatterns.config,
  isActive: apiKeyPatterns.isActive,
  isDefault: apiKeyPatterns.isDefault,
  expiresAt: apiKeyPatterns.expiresAt,
  rateLimit: apiKeyPatterns.rateLimit,
  quota: apiKeyPatterns.quota
}).options({ stripUnknown: true });

// Schema for bulk operations
const bulkOperationSchema = Joi.object({
  operation: Joi.string()
    .valid('activate', 'deactivate', 'delete')
    .required()
    .messages({
      'any.only': 'Operation must be one of: activate, deactivate, delete',
      'any.required': 'Operation is required'
    }),
  ids: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one ID is required',
      'array.max': 'Cannot process more than 100 IDs at once',
      'any.required': 'IDs array is required'
    }),
  data: Joi.object().optional()
}).options({ stripUnknown: true });

// Schema for query parameters
const querySchema = Joi.object({
  provider: apiKeyPatterns.provider.optional()
}).options({ stripUnknown: true });

// Schema for ID parameter
const idSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required'
    })
}).options({ stripUnknown: true });

module.exports = {
  createApiKeySchema,
  updateApiKeySchema,
  bulkOperationSchema,
  querySchema,
  idSchema
}; 