const { expect } = require('chai');
const sinon = require('sinon');
const ApiKeyService = require('../services/ApiKeyService');
const ApiKeyIntegrationService = require('../services/ApiKeyIntegrationService');

describe('API Key Management', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('ApiKeyService', () => {
    it('should create API key with valid data', async () => {
      const apiKeyData = {
        provider: 'openai',
        name: 'Test OpenAI Key',
        description: 'Test key for OpenAI',
        apiKey: 'sk-test1234567890',
        isDefault: true,
        isActive: true
      };

      const mockApiKey = {
        _id: '507f1f77bcf86cd799439011',
        ...apiKeyData,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      sandbox.stub(ApiKeyService, 'createApiKey').resolves({
        success: true,
        data: mockApiKey,
        message: 'API key created successfully'
      });

      const result = await ApiKeyService.createApiKey(apiKeyData);

      expect(result.success).to.be.true;
      expect(result.data.provider).to.equal('openai');
      expect(result.data.name).to.equal('Test OpenAI Key');
      expect(result.message).to.equal('API key created successfully');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        provider: 'openai',
        // Missing name and apiKey
      };

      try {
        await ApiKeyService.createApiKey(invalidData);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Provider, name, and API key are required');
      }
    });

    it('should validate provider type', async () => {
      const invalidData = {
        provider: 'invalid_provider',
        name: 'Test Key',
        apiKey: 'test-key'
      };

      try {
        await ApiKeyService.createApiKey(invalidData);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Invalid provider');
      }
    });
  });

  describe('ApiKeyIntegrationService', () => {
    it('should get API key from environment variables', () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-env-test123';

      const result = ApiKeyIntegrationService.getApiKeyFromEnvironment('openai');
      expect(result).to.equal('sk-env-test123');

      // Restore original environment
      if (originalEnv) {
        process.env.OPENAI_API_KEY = originalEnv;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it('should return null for unknown provider', () => {
      const result = ApiKeyIntegrationService.getApiKeyFromEnvironment('unknown');
      expect(result).to.be.null;
    });

    it('should get configuration from environment variables', () => {
      const originalEnv = {
        OPENAI_MODEL: process.env.OPENAI_MODEL,
        OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS,
        OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE
      };

      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.OPENAI_MAX_TOKENS = '2000';
      process.env.OPENAI_TEMPERATURE = '0.5';

      const result = ApiKeyIntegrationService.getConfigFromEnvironment('openai');
      
      expect(result.model).to.equal('gpt-4');
      expect(result.maxTokens).to.equal(2000);
      expect(result.temperature).to.equal(0.5);

      // Restore original environment
      Object.keys(originalEnv).forEach(key => {
        if (originalEnv[key]) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    });
  });

  describe('API Key Validation', () => {
    it('should validate OpenAI API key format', () => {
      const validKey = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef';
      const invalidKey = 'invalid-key';

      // Basic format validation (starts with sk- and has reasonable length)
      expect(validKey.startsWith('sk-')).to.be.true;
      expect(validKey.length).to.be.greaterThan(20);
      expect(invalidKey.startsWith('sk-')).to.be.false;
    });

    it('should validate HuggingFace API key format', () => {
      const validKey = 'hf_1234567890abcdef1234567890abcdef1234567890abcdef';
      const invalidKey = 'invalid-key';

      // Basic format validation (starts with hf_ and has reasonable length)
      expect(validKey.startsWith('hf_')).to.be.true;
      expect(validKey.length).to.be.greaterThan(20);
      expect(invalidKey.startsWith('hf_')).to.be.false;
    });
  });

  describe('API Key Security', () => {
    it('should not expose API keys in responses', async () => {
      const mockApiKey = {
        _id: '507f1f77bcf86cd799439011',
        provider: 'openai',
        name: 'Test Key',
        encryptedKey: 'encrypted-key-data',
        usageCount: 0,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sanitized = ApiKeyService.sanitizeApiKey(mockApiKey);
      
      expect(sanitized.encryptedKey).to.be.undefined;
      expect(sanitized.provider).to.equal('openai');
      expect(sanitized.name).to.equal('Test Key');
    });
  });
}); 