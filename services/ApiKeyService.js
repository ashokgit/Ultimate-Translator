const ApiKey = require("../models/ApiKey");
const logger = require("../utils/logger");
const { ValidationError, NotFoundError, TranslationError } = require("../utils/errorHandler");

class ApiKeyService {
  /**
   * Create a new API key
   */
  async createApiKey(apiKeyData) {
    try {
      const {
        provider,
        name,
        description,
        apiKey,
        config = {},
        isDefault = false,
        expiresAt,
        rateLimit,
        quota
      } = apiKeyData;

      // Validate required fields
      if (!provider || !name || !apiKey) {
        throw new ValidationError("Provider, name, and API key are required");
      }

      // Validate provider
      const validProviders = ['openai', 'huggingface', 'google', 'custom'];
      if (!validProviders.includes(provider)) {
        throw new ValidationError(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
      }

      // Validate model for OpenAI provider
      if (provider === 'openai' && config.model) {
        const validOpenAIModels = [
          'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.5', 'gpt-4', 'gpt-3.5-turbo'
        ];
        if (!validOpenAIModels.includes(config.model)) {
          throw new ValidationError(`Invalid OpenAI model: ${config.model}. Valid models are: ${validOpenAIModels.join(', ')}`);
        }
      }

      // If this is set as default, unset other defaults for this provider
      if (isDefault) {
        await ApiKey.updateMany(
          { provider, isDefault: true },
          { isDefault: false }
        );
      }

      // Create the API key record
      const newApiKey = new ApiKey({
        provider,
        name,
        description,
        encryptedKey: apiKey, // Will be encrypted by pre-save middleware
        config,
        isDefault,
        expiresAt,
        rateLimit,
        quota: {
          totalRequests: quota?.totalRequests,
          usedRequests: 0,
          resetDate: quota?.resetDate
        }
      });

      await newApiKey.save();

      logger.info("API key created successfully", {
        provider,
        name,
        isDefault
      });

      return {
        success: true,
        data: this.sanitizeApiKey(newApiKey),
        message: "API key created successfully"
      };
    } catch (error) {
      logger.error("Failed to create API key", {
        error: error.message,
        provider: apiKeyData.provider
      });
      throw error;
    }
  }

  /**
   * Get all API keys (with sensitive data removed)
   */
  async getAllApiKeys(provider = null) {
    try {
      const query = provider ? { provider } : {};
      const apiKeys = await ApiKey.find(query).sort({ isDefault: -1, createdAt: -1 });

      const sanitizedKeys = apiKeys.map(key => this.sanitizeApiKey(key));

      return {
        success: true,
        data: sanitizedKeys,
        message: "API keys retrieved successfully"
      };
    } catch (error) {
      logger.error("Failed to get API keys", { error: error.message });
      throw error;
    }
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKeyById(id) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      return {
        success: true,
        data: this.sanitizeApiKey(apiKey),
        message: "API key retrieved successfully"
      };
    } catch (error) {
      logger.error("Failed to get API key by ID", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Update an API key
   */
  async updateApiKey(id, updateData) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      // Handle API key update separately for security
      if (updateData.apiKey) {
        apiKey.encryptedKey = updateData.apiKey; // Will be encrypted by pre-save middleware
        delete updateData.apiKey;
      }

      // Validate model for OpenAI provider if being updated
      if (apiKey.provider === 'openai' && updateData.config && updateData.config.model) {
        const validOpenAIModels = [
          'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.5', 'gpt-4', 'gpt-3.5-turbo'
        ];
        if (!validOpenAIModels.includes(updateData.config.model)) {
          throw new ValidationError(`Invalid OpenAI model: ${updateData.config.model}. Valid models are: ${validOpenAIModels.join(', ')}`);
        }
      }

      // If setting as default, unset other defaults for this provider
      if (updateData.isDefault) {
        await ApiKey.updateMany(
          { provider: apiKey.provider, isDefault: true, _id: { $ne: id } },
          { isDefault: false }
        );
      }

      // Update other fields
      Object.assign(apiKey, updateData);
      await apiKey.save();

      logger.info("API key updated successfully", {
        id,
        provider: apiKey.provider,
        name: apiKey.name
      });

      return {
        success: true,
        data: this.sanitizeApiKey(apiKey),
        message: "API key updated successfully"
      };
    } catch (error) {
      logger.error("Failed to update API key", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(id) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      // Don't allow deletion of the only default key for a provider
      if (apiKey.isDefault) {
        const otherDefaults = await ApiKey.countDocuments({
          provider: apiKey.provider,
          isDefault: true,
          _id: { $ne: id }
        });
        
        if (otherDefaults === 0) {
          throw new ValidationError("Cannot delete the only default API key for this provider");
        }
      }

      await ApiKey.findByIdAndDelete(id);

      logger.info("API key deleted successfully", {
        id,
        provider: apiKey.provider,
        name: apiKey.name
      });

      return {
        success: true,
        message: "API key deleted successfully"
      };
    } catch (error) {
      logger.error("Failed to delete API key", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get API key for use in translation services
   */
  async getApiKeyForProvider(provider, includeKey = false) {
    try {
      const apiKey = await ApiKey.getDefaultKey(provider);
      
      if (!apiKey) {
        return {
          success: false,
          message: `No default API key found for provider: ${provider}`
        };
      }

      if (!apiKey.canUse()) {
        throw new ValidationError(`API key is not available for use (expired, inactive, or quota exceeded)`);
      }
      
      const testResult = await this.performApiKeyTest(apiKey);
      if (!testResult.success) {
        throw new TranslationError(provider, `Default API key validation failed: ${testResult.message}`);
      }

      // Increment usage before returning
      await apiKey.incrementUsage();

      if (includeKey) {
        return {
          success: true,
          data: {
            provider: apiKey.provider,
            apiKey: apiKey.decryptKey(),
            config: apiKey.config,
            source: 'database'
          },
          message: "API key retrieved successfully"
        };
      }

      return {
        success: true,
        data: this.sanitizeApiKey(apiKey),
        message: "API key retrieved successfully"
      };
    } catch (error) {
      logger.error("Failed to get API key for provider", { provider, error: error.message });
      throw error;
    }
  }

  /**
   * Test an API key
   */
  async testApiKey(id) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }
      
      if (!apiKey.isActive) {
        return {
          success: false,
          message: "API key is not active"
        };
      }

      return await this.performApiKeyTest(apiKey);
    } catch (error) {
      logger.error("Failed to test API key", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Set default API key for a provider
   */
  async setDefaultApiKey(id) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      // Unset other defaults for this provider
      await ApiKey.updateMany(
        { provider: apiKey.provider, isDefault: true },
        { isDefault: false }
      );

      // Set this as default
      apiKey.isDefault = true;
      await apiKey.save();

      logger.info("Default API key set", {
        id,
        provider: apiKey.provider,
        name: apiKey.name
      });

      return {
        success: true,
        data: this.sanitizeApiKey(apiKey),
        message: "Default API key set successfully"
      };
    } catch (error) {
      logger.error("Failed to set default API key", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get API key statistics
   */
  async getApiKeyStats() {
    try {
      const stats = await ApiKey.aggregate([
        {
          $group: {
            _id: "$provider",
            totalKeys: { $sum: 1 },
            activeKeys: { $sum: { $cond: ["$isActive", 1, 0] } },
            defaultKeys: { $sum: { $cond: ["$isDefault", 1, 0] } },
            totalUsage: { $sum: "$usageCount" }
          }
        }
      ]);

      return {
        success: true,
        data: stats,
        message: "API key statistics retrieved successfully"
      };
    } catch (error) {
      logger.error("Failed to get API key statistics", { error: error.message });
      throw error;
    }
  }

  /**
   * Sanitize API key data (remove sensitive information)
   */
  sanitizeApiKey(apiKey) {
    const sanitized = apiKey.toObject();
    delete sanitized.encryptedKey;
    return sanitized;
  }

  /**
   * Perform API key test based on provider
   */
  async performApiKeyTest(apiKey) {
    try {
      // Decrypt the key before testing
      const decryptedKey = apiKey.decryptKey();

      if (!decryptedKey) {
        return { success: false, message: "Failed to decrypt API key" };
      }

      switch (apiKey.provider) {
        case 'openai':
          return await this.testOpenAIKey(decryptedKey, apiKey.config);
        case 'huggingface':
          return await this.testHuggingFaceKey(decryptedKey, apiKey.config);
        case 'google':
          return await this.testGoogleKey(decryptedKey, apiKey.config);
        default:
          return { success: true, message: "Custom provider - validation skipped" };
      }
    } catch (error) {
      logger.error("API key test failed", {
        error: error.message,
        provider: apiKey.provider
      });
      return { success: false, message: error.message };
    }
  }

  /**
   * Test OpenAI API key
   */
  async testOpenAIKey(apiKey, config) {
    try {
      const { OpenAI } = require("openai");
      const openai = new OpenAI({ apiKey });
      
      // Simple test call
      const response = await openai.models.list();
      
      return {
        success: true,
        message: "OpenAI API key is valid",
        models: response.data.length
      };
    } catch (error) {
      return {
        success: false,
        message: `OpenAI API key test failed: ${error.message}`
      };
    }
  }

  /**
   * Test HuggingFace API key
   */
  async testHuggingFaceKey(apiKey, config) {
    try {
      const axios = require("axios");
      const response = await axios.get("https://huggingface.co/api/whoami", {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      
      return {
        success: true,
        message: "HuggingFace API key is valid",
        user: response.data.name
      };
    } catch (error) {
      return {
        success: false,
        message: `HuggingFace API key test failed: ${error.message}`
      };
    }
  }

  /**
   * Test Google Translate API key
   */
  async testGoogleKey(apiKey, config) {
    try {
      const { translate } = require("@vitalets/google-translate-api");
      
      // Test translation
      const result = await translate("Hello", { to: "es" });
      
      return {
        success: true,
        message: "Google Translate API key is valid",
        testTranslation: result.text
      };
    } catch (error) {
      return {
        success: false,
        message: `Google Translate API key test failed: ${error.message}`
      };
    }
  }

  /**
   * Get available models for an API key
   */
  async getAvailableModels(id) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      if (apiKey.provider !== 'openai') {
        throw new ValidationError("Model listing is only available for OpenAI API keys");
      }

      // If we have cached models, return them
      if (apiKey.availableModels && apiKey.availableModels.length > 0) {
        return {
          success: true,
          data: {
            models: apiKey.availableModels,
            lastUpdated: apiKey.updatedAt,
            cached: true
          },
          message: "Available models retrieved successfully"
        };
      }

      // If no cached models, fetch them
      return await this.refreshAvailableModels(id);
    } catch (error) {
      logger.error("Failed to get available models", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Refresh available models for an API key
   */
  async refreshAvailableModels(id) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      if (apiKey.provider !== 'openai') {
        throw new ValidationError("Model listing is only available for OpenAI API keys");
      }

      if (!apiKey.isActive) {
        throw new ValidationError("Cannot fetch models for inactive API key");
      }

      // Decrypt the key
      const decryptedKey = apiKey.decryptKey();
      if (!decryptedKey) {
        throw new Error("Failed to decrypt API key");
      }

      // Fetch models from OpenAI
      const { OpenAI } = require("openai");
      const openai = new OpenAI({ apiKey: decryptedKey });
      
      const response = await openai.models.list();
      
      // Filter and format models
      const availableModels = response.data
        .filter(model => [
          'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.5', 'gpt-4', 'gpt-3.5-turbo'
        ].includes(model.id))
        .map(model => ({
          id: model.id,
          name: model.id,
          description: this.getModelDescription(model.id),
          maxTokens: this.getModelMaxTokens(model.id),
          pricing: this.getModelPricing(model.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Update the API key with the new models
      apiKey.availableModels = availableModels;
      await apiKey.save();

      logger.info("Available models refreshed", {
        id,
        modelCount: availableModels.length
      });

      return {
        success: true,
        data: {
          models: availableModels,
          lastUpdated: apiKey.updatedAt,
          cached: false
        },
        message: "Available models refreshed successfully"
      };
    } catch (error) {
      logger.error("Failed to refresh available models", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get model description
   */
  getModelDescription(modelId) {
    const descriptions = {
      'gpt-4o': 'OpenAI GPT-4o flagship model',
      'gpt-4o-mini': 'OpenAI GPT-4o Mini',
      'gpt-4.1': 'OpenAI GPT-4.1',
      'gpt-4.1-mini': 'OpenAI GPT-4.1 Mini',
      'gpt-4.1-nano': 'OpenAI GPT-4.1 Nano',
      'gpt-4.5': 'OpenAI GPT-4.5',
      'gpt-4': 'OpenAI GPT-4',
      'gpt-3.5-turbo': 'OpenAI GPT-3.5 Turbo'
    };
    
    return descriptions[modelId] || `OpenAI ${modelId} model`;
  }

  /**
   * Get model max tokens
   */
  getModelMaxTokens(modelId) {
    const maxTokens = {
      'gpt-4o': 128000,
      'gpt-4o-mini': 64000,
      'gpt-4.1': 128000,
      'gpt-4.1-mini': 64000,
      'gpt-4.1-nano': 32000,
      'gpt-4.5': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 4096
    };
    
    return maxTokens[modelId] || 4096;
  }

  /**
   * Get model pricing (approximate)
   */
  getModelPricing(modelId) {
    const pricing = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.002, output: 0.006 },
      'gpt-4.1': { input: 0.01, output: 0.03 },
      'gpt-4.1-mini': { input: 0.004, output: 0.012 },
      'gpt-4.1-nano': { input: 0.002, output: 0.006 },
      'gpt-4.5': { input: 0.02, output: 0.04 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    };
    
    return pricing[modelId] || { input: 0.001, output: 0.002 };
  }

  /**
   * Validate model for an API key
   */
  async validateModel(id, modelId) {
    try {
      const apiKey = await ApiKey.findById(id);
      
      if (!apiKey) {
        throw new NotFoundError("API key not found");
      }

      if (apiKey.provider !== 'openai') {
        throw new ValidationError("Model validation is only available for OpenAI API keys");
      }

      // If we have cached models, check against them
      if (apiKey.availableModels && apiKey.availableModels.length > 0) {
        const modelExists = apiKey.availableModels.some(model => model.id === modelId);
        if (!modelExists) {
          throw new ValidationError(`Model ${modelId} is not available for this API key`);
        }
        return { success: true, message: "Model is valid" };
      }

      // If no cached models, try to refresh and validate
      await this.refreshAvailableModels(id);
      return await this.validateModel(id, modelId);
    } catch (error) {
      logger.error("Failed to validate model", { id, modelId, error: error.message });
      throw error;
    }
  }
}

module.exports = new ApiKeyService(); 