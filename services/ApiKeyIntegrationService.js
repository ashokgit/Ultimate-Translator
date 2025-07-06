const ApiKeyService = require("./ApiKeyService");
const config = require("../config");
const logger = require("../utils/logger");

class ApiKeyIntegrationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get API key for a specific provider, with fallback to environment variables
   */
  async getApiKeyForProvider(provider, includeKey = false) {
    try {
      // Check if database storage is enabled
      if (config.apiKeyManagement.enableDatabaseStorage) {
        // Let errors from ApiKeyService propagate to prevent silent fallbacks on invalid keys
        const result = await ApiKeyService.getApiKeyForProvider(provider, includeKey);
        if (result.success) {
          logger.info("Using API key from database", { provider });
          return result.data;
        }
        
        // If result.success is false, it means no key was found, so we can fall back.
        logger.info("No default key in DB, falling back to environment", { provider });
      }

      // Fallback to environment variables
      if (config.apiKeyManagement.fallbackToEnvVars) {
        const envKey = this.getApiKeyFromEnvironment(provider);
        if (envKey) {
          logger.info("Using API key from environment variables", { provider });
          return {
            provider,
            apiKey: envKey,
            source: 'environment',
            config: this.getConfigFromEnvironment(provider)
          };
        }
      }

      throw new Error(`No API key found for provider: ${provider}`);
    } catch (error) {
      logger.error("Failed to get API key for provider", { provider, error: error.message });
      throw error;
    }
  }

  /**
   * Get API key from environment variables
   */
  getApiKeyFromEnvironment(provider) {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'huggingface':
        return process.env.HUGGINGFACE_API_KEY;
      case 'google':
        return process.env.GOOGLE_TRANSLATE_API_KEY;
      default:
        return null;
    }
  }

  /**
   * Get configuration from environment variables
   */
  getConfigFromEnvironment(provider) {
    switch (provider) {
      case 'openai':
        return {
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
        };
      case 'huggingface':
        return {
          apiUrl: process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co'
        };
      case 'google':
        return {
          proxies: process.env.GOOGLE_TRANSLATE_PROXIES 
            ? process.env.GOOGLE_TRANSLATE_PROXIES.split(',').map(proxy => proxy.trim())
            : []
        };
      default:
        return {};
    }
  }

  /**
   * Update configuration with API key data
   */
  async updateConfigWithApiKey(provider, configData = {}) {
    try {
      const apiKeyData = await this.getApiKeyForProvider(provider, true);
      
      if (!apiKeyData) {
        throw new Error(`No API key available for provider: ${provider}`);
      }

      // Merge configuration
      const updatedConfig = {
        ...configData,
        ...apiKeyData.config
      };

      // Add API key to config
      updatedConfig.apiKey = apiKeyData.apiKey;

      logger.info("Configuration updated with API key", { provider });
      return updatedConfig;
    } catch (error) {
      logger.error("Failed to update config with API key", { provider, error: error.message });
      throw error;
    }
  }

  /**
   * Initialize API keys from environment variables to database
   */
  async initializeApiKeysFromEnvironment() {
    try {
      if (!config.apiKeyManagement.enableDatabaseStorage) {
        logger.info("Database storage disabled, skipping initialization");
        return;
      }

      const providers = ['openai', 'huggingface', 'google'];
      const results = [];

      for (const provider of providers) {
        const envKey = this.getApiKeyFromEnvironment(provider);
        if (envKey) {
          try {
            // Check if key already exists
            const existingKeys = await ApiKeyService.getAllApiKeys(provider);
            const hasDefault = existingKeys.data.some(key => key.isDefault);

            if (!hasDefault) {
              const result = await ApiKeyService.createApiKey({
                provider,
                name: `${provider.toUpperCase()} Environment Key`,
                description: `API key imported from environment variables`,
                apiKey: envKey,
                config: this.getConfigFromEnvironment(provider),
                isDefault: true
              });

              results.push({ provider, success: true, message: "Created default key" });
              logger.info("Created default API key from environment", { provider });
            } else {
              results.push({ provider, success: false, message: "Default key already exists" });
            }
          } catch (error) {
            results.push({ provider, success: false, error: error.message });
            logger.error("Failed to create API key from environment", { provider, error: error.message });
          }
        } else {
          results.push({ provider, success: false, message: "No environment key found" });
        }
      }

      return results;
    } catch (error) {
      logger.error("Failed to initialize API keys from environment", { error: error.message });
      throw error;
    }
  }

  /**
   * Get API key status for all providers
   */
  async getApiKeyStatus() {
    try {
      const providers = ['openai', 'huggingface', 'google'];
      const status = {};

      for (const provider of providers) {
        try {
          const apiKeyData = await this.getApiKeyForProvider(provider, false);
          status[provider] = {
            available: true,
            source: apiKeyData.source || 'database',
            hasConfig: !!apiKeyData.config
          };
        } catch (error) {
          status[provider] = {
            available: false,
            error: error.message
          };
        }
      }

      return status;
    } catch (error) {
      logger.error("Failed to get API key status", { error: error.message });
      throw error;
    }
  }

  /**
   * Validate API key configuration
   */
  async validateApiKeyConfiguration(provider) {
    try {
      const apiKeyData = await this.getApiKeyForProvider(provider, true);
      
      if (!apiKeyData || !apiKeyData.apiKey) {
        return {
          valid: false,
          message: `No API key found for provider: ${provider}`
        };
      }

      // Test the API key
      const testResult = await this.testApiKey(provider, apiKeyData);
      
      return {
        valid: testResult.valid,
        message: testResult.message,
        details: testResult
      };
    } catch (error) {
      return {
        valid: false,
        message: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Test API key functionality
   */
  async testApiKey(provider, apiKeyData) {
    try {
      switch (provider) {
        case 'openai':
          return await this.testOpenAIKey(apiKeyData);
        case 'huggingface':
          return await this.testHuggingFaceKey(apiKeyData);
        case 'google':
          return await this.testGoogleKey(apiKeyData);
        default:
          return { valid: true, message: "Custom provider - validation skipped" };
      }
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * Test OpenAI API key
   */
  async testOpenAIKey(apiKeyData) {
    try {
      const { OpenAI } = require("openai");
      const openai = new OpenAI({ 
        apiKey: apiKeyData.apiKey 
      });
      
      const response = await openai.models.list();
      
      return {
        valid: true,
        message: "OpenAI API key is valid",
        models: response.data.length,
        config: apiKeyData.config
      };
    } catch (error) {
      return {
        valid: false,
        message: `OpenAI API key test failed: ${error.message}`
      };
    }
  }

  /**
   * Test HuggingFace API key
   */
  async testHuggingFaceKey(apiKeyData) {
    try {
      const axios = require("axios");
      const response = await axios.get("https://huggingface.co/api/whoami", {
        headers: { Authorization: `Bearer ${apiKeyData.apiKey}` }
      });
      
      return {
        valid: true,
        message: "HuggingFace API key is valid",
        user: response.data.name,
        config: apiKeyData.config
      };
    } catch (error) {
      return {
        valid: false,
        message: `HuggingFace API key test failed: ${error.message}`
      };
    }
  }

  /**
   * Test Google Translate API key
   */
  async testGoogleKey(apiKeyData) {
    try {
      const { translate } = require("@vitalets/google-translate-api");
      
      const result = await translate("Hello", { to: "es" });
      
      return {
        valid: true,
        message: "Google Translate API key is valid",
        testTranslation: result.text,
        config: apiKeyData.config
      };
    } catch (error) {
      return {
        valid: false,
        message: `Google Translate API key test failed: ${error.message}`
      };
    }
  }
}

module.exports = new ApiKeyIntegrationService(); 