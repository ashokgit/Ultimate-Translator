const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const testData = require('./fixtures/testData');
const TranslationLog = require('../models/TranslationLog');
const TranslatedPage = require('../models/TranslatedPage');
const axios = require('axios');

describe('API Integration Tests', () => {
  let axiosStub, mongoStub, saveStub, app;

  before(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.OPENAI_API_KEY = 'test-key-sk-1234567890';
    process.env.DEFAULT_TRANSLATOR = 'openai';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';
    
    // Now require the app after setting environment variables
    app = require('../server');
  });

  after(() => {
    // Clean up
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEFAULT_TRANSLATOR;
    delete process.env.MONGODB_URI;
  });

  beforeEach(() => {
    // Stub external API calls
    axiosStub = sinon.stub(axios, 'post');
    
    // Stub database operations
    mongoStub = sinon.stub(TranslationLog, 'findOne');
    sinon.stub(TranslatedPage, 'findOne');
    sinon.stub(TranslatedPage, 'find');
    
    // Stub save operations
    saveStub = sinon.stub(TranslationLog.prototype, 'save').resolves();
    sinon.stub(TranslatedPage.prototype, 'save').resolves();
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });

  describe('POST /api/v1/string-translate', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/string-translate')
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
      expect(response.body.error.details).to.be.an('array');
    });

    it('should reject empty text', async () => {
      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(testData.invalidRequests.emptyText)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should reject invalid language codes', async () => {
      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(testData.invalidRequests.invalidLanguage)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should accept valid language codes', async () => {
      const validLanguages = ['es', 'fr', 'de', 'en-US', 'zh-CN', 'pt-BR'];
      
      for (const lang of validLanguages) {
        const response = await request(app)
          .post('/api/v1/string-translate')
          .send({ text: 'Hello', language: lang });

        // Response might be 200 (cached) or 503 (service error), but not 400 (validation error)
        expect(response.status).to.not.equal(400);
      }
    });

    it('should translate text successfully (cached)', async () => {
      // Mock cached translation
      mongoStub.resolves({
        text: 'Hello world',
        lang: 'es',
        translated_text: 'Hola mundo'
      });

      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(testData.validTranslationRequests.simple)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.translation).to.equal('Hola mundo');
      expect(response.body.meta.cached).to.be.true;
      expect(response.body.timestamp).to.be.a('string');
    });

    it('should translate text successfully (API call)', async () => {
      // Mock cache miss and API success
      mongoStub.resolves(null);
      axiosStub.resolves(testData.mockApiResponses.openai.success);

      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(testData.validTranslationRequests.simple)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.translation).to.equal('Hola mundo');
      expect(response.body.meta.cached).to.be.false;
      expect(response.body.meta.provider).to.equal('OpenAI');
      expect(saveStub.calledOnce).to.be.true;
    });

    it('should handle translation service errors', async () => {
      mongoStub.resolves(null);
      axiosStub.rejects(testData.mockApiResponses.openai.rateLimitError);

      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(testData.validTranslationRequests.simple)
        .expect(503);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('TRANSLATION_ERROR');
      expect(response.body.error.provider).to.equal('OpenAI');
    });

    it('should sanitize malicious input', async () => {
      mongoStub.resolves(null);
      axiosStub.resolves(testData.mockApiResponses.openai.success);

      const maliciousInput = {
        text: 'Hello <script>alert("xss")</script> world',
        language: 'es'
      };

      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(maliciousInput)
        .expect(200);

      // Check that script was sanitized in the API call
      expect(axiosStub.args[0][1].messages[0].content).to.not.include('<script>');
    });

    it('should handle multiple language codes correctly', async () => {
      const validLanguages = ['es', 'fr', 'de', 'en-US', 'zh-CN'];

      for (const lang of validLanguages) {
        mongoStub.resolves({
          text: 'Hello',
          lang: lang,
          translated_text: `Hello in ${lang}`
        });

        const response = await request(app)
          .post('/api/v1/string-translate')
          .send({ text: 'Hello', language: lang })
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.translation).to.equal(`Hello in ${lang}`);
      }
    });
  });

  describe('GET /api/v1/translate', () => {
    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/translate')
        .query({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should reject invalid URLs', async () => {
      const response = await request(app)
        .get('/api/v1/translate')
        .query(testData.invalidRequests.invalidUrl)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should translate page content successfully', async () => {
      // Mock successful JSON fetch
      const mockAxiosGet = sinon.stub(axios, 'get');
      mockAxiosGet.resolves({
        data: testData.pageTranslationRequests.blog.sourceData
      });

      // Mock page not found in database (new translation)
      TranslatedPage.findOne.resolves(null);

      // Mock translation service
      mongoStub.resolves(null);
      axiosStub.resolves(testData.mockApiResponses.openai.success);

      const response = await request(app)
        .get('/api/v1/translate')
        .query({
          model_name: 'blog',
          language: 'es',
          source_url: 'https://example.com/content.json',
          content_id: 'blog123'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.translations).to.be.an('object');
      expect(response.body.meta.totalFields).to.be.a('number');

      mockAxiosGet.restore();
    });

    it('should return cached page translation', async () => {
      // Mock existing translated page
      TranslatedPage.findOne.resolves({
        content_id: 'test123',
        translations: [
          {
            es: testData.pageTranslationRequests.blog.expectedTranslation
          }
        ],
        source_data: testData.pageTranslationRequests.blog.sourceData,
        last_requested_at: new Date()
      });

      const response = await request(app)
        .get('/api/v1/translate')
        .query({
          model_name: 'blog',
          language: 'es',
          source_url: 'https://example.com/content.json',
          content_id: 'test123'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.meta.cached).to.be.true;
      expect(response.body.data.translations.es).to.deep.equal(
        testData.pageTranslationRequests.blog.expectedTranslation
      );
    });
  });

  describe('POST /api/v1/update-translation', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/v1/update-translation')
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should reject invalid JSON', async () => {
      const response = await request(app)
        .post('/api/v1/update-translation')
        .send(testData.invalidRequests.invalidJson)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should update translation successfully', async () => {
      // Mock existing translated page
      const mockPage = {
        content_id: 'test123',
        translations: [{ es: { title: 'Old Title' } }],
        save: sinon.stub().resolves()
      };
      TranslatedPage.findOne.resolves(mockPage);

      const updateData = {
        content_id: 'test123',
        model_name: 'blog',
        language: 'es',
        updatedJson: JSON.stringify({ title: 'New Title', content: 'New Content' })
      };

      const response = await request(app)
        .post('/api/v1/update-translation')
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('updated successfully');
      expect(mockPage.save.calledOnce).to.be.true;
    });

    it('should handle page not found', async () => {
      TranslatedPage.findOne.resolves(null);

      const updateData = {
        content_id: 'nonexistent',
        model_name: 'blog',
        language: 'es',
        updatedJson: JSON.stringify({ title: 'Title' })
      };

      const response = await request(app)
        .post('/api/v1/update-translation')
        .send(updateData)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('NOT_FOUND_ERROR');
    });
  });

  describe('GET /api/v1/translated-list', () => {
    it('should return list endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/translated-list')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.pages).to.be.an('array');
      expect(response.body.meta.total).to.be.a('number');
    });

    it('should return list of translated pages', async () => {
      TranslatedPage.find.resolves([
        {
          content_id: 'test1',
          model_name: 'blog',
          source_url: 'https://example.com/test1.json',
          translations: [{ es: { title: 'Test 1' } }],
          last_requested_at: new Date()
        },
        {
          content_id: 'test2',
          model_name: 'product',
          source_url: 'https://example.com/test2.json',
          translations: [{ fr: { name: 'Test 2' } }],
          last_requested_at: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/v1/translated-list')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.pages).to.be.an('array').with.length(2);
      expect(response.body.meta.total).to.equal(2);
    });

    it('should filter by model_name', async () => {
      TranslatedPage.find.resolves([
        {
          content_id: 'blog1',
          model_name: 'blog',
          translations: [{ es: { title: 'Blog 1' } }]
        }
      ]);

      const response = await request(app)
        .get('/api/v1/translated-list')
        .query({ model_name: 'blog' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(TranslatedPage.find.calledWith({ model_name: 'blog' })).to.be.true;
    });
  });

  describe('GET /api/v1/available-languages', () => {
    it('should return available languages', async () => {
      const response = await request(app)
        .get('/api/v1/available-languages')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.languages).to.be.an('array');
      expect(response.body.data.languages.length).to.be.greaterThan(0);
      
      // Check some common languages are included
      const languageCodes = response.body.data.languages.map(l => l.code);
      expect(languageCodes).to.include('es');
      expect(languageCodes).to.include('fr');
      expect(languageCodes).to.include('de');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database error
      mongoStub.rejects(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(testData.validTranslationRequests.simple)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error.type).to.equal('INTERNAL_SERVER_ERROR');
    });

    it('should log errors properly', async () => {
      // Mock logger to capture logs
      const logger = require('../utils/logger');
      const loggerSpy = sinon.spy(logger, 'error');

      mongoStub.rejects(new Error('Test error'));

      await request(app)
        .post('/api/v1/string-translate')
        .send(testData.validTranslationRequests.simple)
        .expect(500);

      expect(loggerSpy.called).to.be.true;
      expect(loggerSpy.args[0][0]).to.equal('Request error');

      loggerSpy.restore();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/v1/available-languages')
        .expect(200);

      expect(response.headers).to.have.property('x-content-type-options');
      expect(response.headers).to.have.property('x-frame-options');
      expect(response.headers).to.have.property('x-xss-protection');
    });
  });

  describe('Request/Response Logging', () => {
    it('should log request and response data', async () => {
      const logger = require('../utils/logger');
      const loggerSpy = sinon.spy(logger, 'info');

      mongoStub.resolves({
        text: 'Hello',
        lang: 'es',
        translated_text: 'Hola'
      });

      await request(app)
        .post('/api/v1/string-translate')
        .send({ text: 'Hello', language: 'es' })
        .expect(200);

      // Should log request
      expect(loggerSpy.calledWith('Request received')).to.be.true;
      
      loggerSpy.restore();
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/v1/string-translate')
        .send({})
        .expect(400);

      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('type');
      expect(response.body.error).to.have.property('message');
      expect(response.body.error).to.have.property('timestamp');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const maliciousInput = {
        text: 'Hello <script>alert("xss")</script> world',
        language: 'es'
      };

      const response = await request(app)
        .post('/api/v1/string-translate')
        .send(maliciousInput);

      // Should not return 400 (validation error) - input should be sanitized
      expect(response.status).to.not.equal(400);
    });
  });
}); 