const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');

describe('Model Selection for OpenAI API Keys', () => {
  let testApiKeyId;
  const testApiKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';

  beforeAll(async () => {
    // Create a test API key
    const apiKey = new ApiKey({
      provider: 'openai',
      name: 'Test OpenAI Key',
      description: 'Test key for model selection',
      encryptedKey: testApiKey,
      config: {
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7
      },
      isActive: true,
      isDefault: false
    });
    
    await apiKey.save();
    testApiKeyId = apiKey._id.toString();
  });

  afterAll(async () => {
    // Clean up test data
    await ApiKey.findByIdAndDelete(testApiKeyId);
  });

  describe('GET /api/v1/api-keys/:id/models', () => {
    it('should return available models for OpenAI API key', async () => {
      const response = await request(app)
        .get(`/api/v1/api-keys/${testApiKeyId}/models`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('models');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(response.body.data).toHaveProperty('cached');
      expect(Array.isArray(response.body.data.models)).toBe(true);
    });

    it('should return 404 for non-existent API key', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/v1/api-keys/${fakeId}/models`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for non-OpenAI API key', async () => {
      // Create a non-OpenAI API key
      const nonOpenAIKey = new ApiKey({
        provider: 'huggingface',
        name: 'Test HuggingFace Key',
        description: 'Test key for HuggingFace',
        encryptedKey: 'hf_test1234567890',
        isActive: true,
        isDefault: false
      });
      
      await nonOpenAIKey.save();
      
      const response = await request(app)
        .get(`/api/v1/api-keys/${nonOpenAIKey._id}/models`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Model listing is only available for OpenAI API keys');

      // Clean up
      await ApiKey.findByIdAndDelete(nonOpenAIKey._id);
    });
  });

  describe('POST /api/v1/api-keys/:id/models/refresh', () => {
    it('should refresh available models for OpenAI API key', async () => {
      const response = await request(app)
        .post(`/api/v1/api-keys/${testApiKeyId}/models/refresh`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('models');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(response.body.data.cached).toBe(false);
      expect(Array.isArray(response.body.data.models)).toBe(true);
    });

    it('should return 404 for non-existent API key', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/v1/api-keys/${fakeId}/models/refresh`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for inactive API key', async () => {
      // Create an inactive API key
      const inactiveKey = new ApiKey({
        provider: 'openai',
        name: 'Inactive OpenAI Key',
        description: 'Inactive test key',
        encryptedKey: testApiKey,
        isActive: false,
        isDefault: false
      });
      
      await inactiveKey.save();
      
      const response = await request(app)
        .post(`/api/v1/api-keys/${inactiveKey._id}/models/refresh`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot fetch models for inactive API key');

      // Clean up
      await ApiKey.findByIdAndDelete(inactiveKey._id);
    });
  });

  describe('Model validation in API key creation', () => {
    it('should accept valid OpenAI model', async () => {
      const validModelData = {
        provider: 'openai',
        name: 'Valid Model Key',
        description: 'Test key with valid model',
        apiKey: testApiKey,
        config: {
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.5
        },
        isActive: true
      };

      const response = await request(app)
        .post('/api/v1/api-keys')
        .send(validModelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.model).toBe('gpt-4');

      // Clean up
      await ApiKey.findByIdAndDelete(response.body.data._id);
    });

    it('should reject invalid OpenAI model', async () => {
      const invalidModelData = {
        provider: 'openai',
        name: 'Invalid Model Key',
        description: 'Test key with invalid model',
        apiKey: testApiKey,
        config: {
          model: 'invalid-model-name',
          maxTokens: 1000,
          temperature: 0.7
        },
        isActive: true
      };

      const response = await request(app)
        .post('/api/v1/api-keys')
        .send(invalidModelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OpenAI model');
    });
  });

  describe('Model validation in API key updates', () => {
    it('should accept valid model update', async () => {
      const updateData = {
        config: {
          model: 'gpt-4-turbo',
          maxTokens: 4000
        }
      };

      const response = await request(app)
        .put(`/api/v1/api-keys/${testApiKeyId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.model).toBe('gpt-4-turbo');
    });

    it('should reject invalid model update', async () => {
      const invalidUpdateData = {
        config: {
          model: 'invalid-model-update',
          maxTokens: 1000
        }
      };

      const response = await request(app)
        .put(`/api/v1/api-keys/${testApiKeyId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OpenAI model');
    });
  });

  describe('Model information in API key responses', () => {
    it('should include available models in API key details', async () => {
      const response = await request(app)
        .get(`/api/v1/api-keys/${testApiKeyId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('availableModels');
      expect(Array.isArray(response.body.data.availableModels)).toBe(true);
    });

    it('should include model information in provider details', async () => {
      const response = await request(app)
        .get('/api/v1/api-keys/providers')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const openaiProvider = response.body.data.find(p => p.id === 'openai');
      expect(openaiProvider).toBeDefined();
      expect(openaiProvider.configFields).toContainEqual(
        expect.objectContaining({
          name: 'model',
          type: 'string',
          default: 'gpt-3.5-turbo'
        })
      );
    });
  });
}); 