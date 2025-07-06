const ApiKeyService = require("../services/ApiKeyService");
const logger = require("../utils/logger");
const { successResponse } = require("../utils/errorHandler");

/**
 * @swagger
 * tags:
 *   name: API Key Management
 *   description: Endpoints for managing API keys for translation providers.
 */
const apiKeyController = {
  /**
   * @swagger
   * /api/v1/api-keys:
   *   post:
   *     summary: Create a new API key
   *     tags: [API Key Management]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               provider:
   *                 type: string
   *               apiKey:
   *                 type: string
   *     responses:
   *       '201':
   *         description: API key created successfully.
   *       '400':
   *         description: Bad request.
   */
  createApiKey: async (req, res) => {
    try {
      const result = await ApiKeyService.createApiKey(req.body);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(201).json(response);
    } catch (error) {
      logger.error("Failed to create API key", {
        error: error.message,
        body: req.body
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys:
   *   get:
   *     summary: Get all API keys
   *     tags: [API Key Management]
   *     parameters:
   *       - in: query
   *         name: provider
   *         schema:
   *           type: string
   *         description: Filter by provider (e.g., openai, google).
   *     responses:
   *       '200':
   *         description: A list of API keys.
   */
  getAllApiKeys: async (req, res) => {
    try {
      const { provider } = req.query;
      const result = await ApiKeyService.getAllApiKeys(provider);
      
      const response = successResponse(
        result.data,
        result.message,
        { provider: provider || 'all' }
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get API keys", {
        error: error.message,
        query: req.query
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}:
   *   get:
   *     summary: Get a specific API key by ID
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the API key.
   *     responses:
   *       '200':
   *         description: The requested API key.
   *       '404':
   *         description: API key not found.
   */
  getApiKeyById: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.getApiKeyById(id);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get API key by ID", {
        id: req.params.id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}:
   *   put:
   *     summary: Update an API key
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               apiKey:
   *                 type: string
   *     responses:
   *       '200':
   *         description: API key updated successfully.
   *       '404':
   *         description: API key not found.
   */
  updateApiKey: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.updateApiKey(id, req.body);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to update API key", {
        id: req.params.id,
        error: error.message,
        body: req.body
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}:
   *   delete:
   *     summary: Delete an API key
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: API key deleted successfully.
   *       '404':
   *         description: API key not found.
   */
  deleteApiKey: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.deleteApiKey(id);
      
      const response = successResponse(
        null,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to delete API key", {
        id: req.params.id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}/test:
   *   post:
   *     summary: Test an API key
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: API key test result.
   *       '404':
   *         description: API key not found.
   */
  testApiKey: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.testApiKey(id);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to test API key", {
        id: req.params.id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}/default:
   *   put:
   *     summary: Set default API key for a provider
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Default API key set successfully.
   *       '404':
   *         description: API key not found.
   */
  setDefaultApiKey: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.setDefaultApiKey(id);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to set default API key", {
        id: req.params.id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/stats:
   *   get:
   *     summary: Get API key statistics
   *     tags: [API Key Management]
   *     responses:
   *       '200':
   *         description: A summary of API key statistics.
   */
  getApiKeyStats: async (req, res) => {
    try {
      const result = await ApiKeyService.getApiKeyStats();
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get API key statistics", {
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/providers:
   *   get:
   *     summary: Get available providers
   *     tags: [API Key Management]
   *     responses:
   *       '200':
   *         description: A list of available translation providers.
   */
  getAvailableProviders: async (req, res) => {
    try {
      const providers = [
        {
          id: 'openai',
          name: 'OpenAI',
          description: 'OpenAI GPT models for translation',
          configFields: [
            { name: 'model', type: 'string', default: 'gpt-3.5-turbo', description: 'Model to use for translation' },
            { name: 'maxTokens', type: 'number', default: 1000, description: 'Maximum tokens for response' },
            { name: 'temperature', type: 'number', default: 0.7, description: 'Creativity level (0-1)' }
          ]
        },
        {
          id: 'huggingface',
          name: 'HuggingFace',
          description: 'HuggingFace translation models',
          configFields: [
            { name: 'apiUrl', type: 'string', default: 'https://api-inference.huggingface.co', description: 'HuggingFace API URL' }
          ]
        },
        {
          id: 'google',
          name: 'Google Translate',
          description: 'Google Translate API',
          configFields: [
            { name: 'proxies', type: 'array', default: [], description: 'Proxy servers for translation' }
          ]
        },
        {
          id: 'custom',
          name: 'Custom Provider',
          description: 'Custom translation service',
          configFields: [
            { name: 'apiUrl', type: 'string', required: true, description: 'Custom API endpoint' }
          ]
        }
      ];

      const response = successResponse(
        providers,
        "Available providers retrieved successfully"
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get available providers", {
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}/models:
   *   get:
   *     summary: Get available OpenAI models for an API key
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: A list of available models.
   *       '404':
   *         description: API key not found.
   */
  getAvailableModels: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.getAvailableModels(id);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get available models", {
        id: req.params.id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/{id}/models/refresh:
   *   post:
   *     summary: Refresh the list of available OpenAI models for an API key
   *     tags: [API Key Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Model list refreshed successfully.
   *       '404':
   *         description: API key not found.
   */
  refreshAvailableModels: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ApiKeyService.refreshAvailableModels(id);
      
      const response = successResponse(
        result.data,
        result.message
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to refresh available models", {
        id: req.params.id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/bulk:
   *   post:
   *     summary: Perform bulk operations on API keys
   *     tags: [API Key Management]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               operation:
   *                 type: string
   *               ids:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       '200':
   *         description: Bulk operation completed successfully.
   */
  bulkOperations: async (req, res) => {
    try {
      const { operation, ids, data } = req.body;

      if (!operation || !ids || !Array.isArray(ids)) {
        throw new Error("Operation and array of IDs are required");
      }

      let results = [];

      switch (operation) {
        case 'activate':
          for (const id of ids) {
            try {
              const result = await ApiKeyService.updateApiKey(id, { isActive: true });
              results.push({ id, success: true, data: result.data });
            } catch (error) {
              results.push({ id, success: false, error: error.message });
            }
          }
          break;

        case 'deactivate':
          for (const id of ids) {
            try {
              const result = await ApiKeyService.updateApiKey(id, { isActive: false });
              results.push({ id, success: true, data: result.data });
            } catch (error) {
              results.push({ id, success: false, error: error.message });
            }
          }
          break;

        case 'delete':
          for (const id of ids) {
            try {
              await ApiKeyService.deleteApiKey(id);
              results.push({ id, success: true });
            } catch (error) {
              results.push({ id, success: false, error: error.message });
            }
          }
          break;

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      const response = successResponse(
        { results, summary: { total: ids.length, successful, failed } },
        `Bulk operation completed: ${successful} successful, ${failed} failed`
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to perform bulk operation", {
        error: error.message,
        body: req.body
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/api-keys/initialize-env:
   *   post:
   *     summary: Initialize API keys from environment variables
   *     tags: [API Key Management]
   *     responses:
   *       '200':
   *         description: API keys initialized successfully.
   */
  initializeFromEnv: async (req, res) => {
    try {
      // ... existing code ...
    } catch (error) {
      // ... existing code ...
    }
  }
};

module.exports = apiKeyController; 