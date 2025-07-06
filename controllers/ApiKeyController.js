const ApiKeyService = require("../services/ApiKeyService");
const logger = require("../utils/logger");
const { successResponse } = require("../utils/errorHandler");

const apiKeyController = {
  /**
   * Create a new API key
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
   * Get all API keys
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
   * Get a specific API key by ID
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
   * Update an API key
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
   * Delete an API key
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
   * Test an API key
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
   * Set default API key for a provider
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
   * Get API key statistics
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
   * Get available providers
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
   * Get available OpenAI models for an API key
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
   * Refresh available models for an API key
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
   * Bulk operations on API keys
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
  }
};

module.exports = apiKeyController; 