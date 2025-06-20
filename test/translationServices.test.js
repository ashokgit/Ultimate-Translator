const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const testData = require('./fixtures/testData');

// Import translation services
const TextTranslator = require('../translators/TextTranslator');
const GoogleTranslator = require('../translators/GoogleTranslator');
const HuggingFaceTranslator = require('../translators/HuggingFaceTranslator');
const OpenAITranslator = require('../translators/OpenAITranslator');
const TranslationLog = require('../models/TranslationLog');
const { TranslationError } = require('../utils/errorHandler');

describe('Translation Services', () => {
  let axiosStub, mongooseStub;

  beforeEach(() => {
    // Set test environment variables first
    process.env.NODE_ENV = 'test';
    process.env.OPENAI_API_KEY = 'test-key-sk-1234567890';
    process.env.DEFAULT_TRANSLATOR = 'openai';
    
    // Stub axios to prevent real API calls
    axiosStub = sinon.stub(axios, 'post');
    sinon.stub(axios, 'get');
    
    // Stub database operations
    mongooseStub = sinon.stub(TranslationLog, 'findOne');
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
    
    // Clear require cache to ensure fresh modules
    delete require.cache[require.resolve('../config')];
    delete require.cache[require.resolve('../translators/OpenAITranslator')];
    delete require.cache[require.resolve('../translators/TextTranslator')];
  });

  describe('OpenAI Translator', () => {
    let translator;

    beforeEach(() => {
      // Clear cache and set test API key
      delete require.cache[require.resolve('../config')];
      delete require.cache[require.resolve('../translators/OpenAITranslator')];
      
      process.env.OPENAI_API_KEY = 'test-key-sk-1234567890';
      
      const OpenAITranslator = require('../translators/OpenAITranslator');
      translator = new OpenAITranslator();
    });

    afterEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    it('should initialize with proper configuration', () => {
      expect(translator.apiKey).to.equal('test-key-sk-1234567890');
      expect(translator.model).to.be.a('string');
      expect(translator.maxTokens).to.be.a('number');
    });

    it('should translate text successfully', async () => {
      // Mock successful OpenAI response
      axios.post.resolves(testData.mockApiResponses.openai.success);

      const result = await translator.translate('Hello world', 'es');

      expect(result).to.equal('Hola mundo');
      expect(axios.post.calledOnce).to.be.true;

      // Verify API call parameters
      const callArgs = axios.post.args[0];
      expect(callArgs[0]).to.equal('https://api.openai.com/v1/chat/completions');
      expect(callArgs[1]).to.have.property('model');
      expect(callArgs[1]).to.have.property('messages');
      expect(callArgs[2].headers.Authorization).to.include('Bearer');
    });

    it('should handle rate limit errors gracefully', async () => {
      axios.post.rejects(testData.mockApiResponses.openai.rateLimitError);

      try {
        await translator.translate('Hello world', 'es');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TranslationError);
        expect(error.provider).to.equal('OpenAI');
        expect(error.message).to.include('Rate limit exceeded');
      }
    });

    it('should handle invalid API key errors', async () => {
      axios.post.rejects(testData.mockApiResponses.openai.invalidApiKey);

      try {
        await translator.translate('Hello world', 'es');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TranslationError);
        expect(error.message).to.include('Invalid API key');
      }
    });

    it('should throw error when API key is missing', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      // Clear require cache to force config reload
      delete require.cache[require.resolve('../config')];
      delete require.cache[require.resolve('../translators/OpenAITranslator')];

      try {
        const OpenAITranslator = require('../translators/OpenAITranslator');
        expect(() => new OpenAITranslator()).to.throw('OpenAI API key is required');
      } finally {
        process.env.OPENAI_API_KEY = originalKey;
        // Clear cache again to restore normal state
        delete require.cache[require.resolve('../config')];
        delete require.cache[require.resolve('../translators/OpenAITranslator')];
      }
    });
  });

  describe('Google Translator', () => {
    let translator;

    beforeEach(() => {
      translator = new GoogleTranslator();
    });

    it('should initialize with proxy configuration', () => {
      expect(translator.proxyUrls).to.be.an('array');
    });

    it('should translate text successfully without proxy', async () => {
      // Mock google-translate-api
      const googleTranslateApi = require('@vitalets/google-translate-api');
      
      // Restore any existing stub first
      if (googleTranslateApi.translate.restore) {
        googleTranslateApi.translate.restore();
      }
      
      const translateStub = sinon.stub(googleTranslateApi, 'translate');
      translateStub.resolves({ text: 'Hola Mundo' });

      const result = await translator.translate('Hello world', 'es');

      expect(result).to.equal('Hola Mundo');
      expect(translateStub.calledOnce).to.be.true;

      translateStub.restore();
    });

    it('should handle translation errors', async () => {
      const googleTranslateApi = require('@vitalets/google-translate-api');
      
      // Create a fresh stub - first restore if exists
      if (googleTranslateApi.translate.restore) {
        googleTranslateApi.translate.restore();
      }
      
      const translateStub = sinon.stub(googleTranslateApi, 'translate');
      translateStub.rejects(new Error('Service unavailable'));

      try {
        await translator.translate('Hello world', 'es');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TranslationError);
        expect(error.provider).to.equal('Google');
      }

      translateStub.restore();
    });
  });

  describe('HuggingFace Translator', () => {
    let translator;

    beforeEach(() => {
      translator = new HuggingFaceTranslator();
    });

    it('should translate text successfully', async () => {
      // Mock successful HuggingFace response structure
      axios.post.resolves({ 
        data: { translated_text: 'Hola mundo' },
        status: 200
      });

      const result = await translator.translate('Hello world', 'es');

      expect(result).to.equal('Hola mundo');
      expect(axios.post.calledOnce).to.be.true;

      // Verify API call structure
      const callArgs = axios.post.args[0];
      expect(callArgs[0]).to.include('localhost:5000');
      expect(callArgs[1]).to.have.property('text', 'Hello world');
      expect(callArgs[1]).to.have.property('lang', 'es');
    });

    it('should handle service unavailable errors', async () => {
      axios.post.rejects(testData.mockApiResponses.huggingface.serviceUnavailable);

      try {
        await translator.translate('Hello world', 'es');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(TranslationError);
        expect(error.provider).to.equal('HuggingFace');
        expect(error.message).to.include('Service unavailable');
      }
    });
  });

  describe('TextTranslator (Main Service)', () => {
    let textTranslator;
    let saveStub;

    beforeEach(() => {
      // Clear cache and set test environment
      delete require.cache[require.resolve('../config')];
      delete require.cache[require.resolve('../translators/TextTranslator')];
      delete require.cache[require.resolve('../translators/OpenAITranslator')];
      
      process.env.DEFAULT_TRANSLATOR = 'openai';
      process.env.OPENAI_API_KEY = 'test-key-sk-1234567890';
      
      const TextTranslator = require('../translators/TextTranslator');
      textTranslator = new TextTranslator();
      
      // Stub the save method
      saveStub = sinon.stub(TranslationLog.prototype, 'save').resolves();
    });

    afterEach(() => {
      delete process.env.DEFAULT_TRANSLATOR;
      delete process.env.OPENAI_API_KEY;
    });

    describe('Caching Behavior', () => {
      it('should return cached translation when available', async () => {
        // Mock database to return cached translation
        TranslationLog.findOne.resolves({
          text: 'Hello world',
          lang: 'es',
          translated_text: 'Hola mundo (cached)'
        });

        const result = await textTranslator.translate('Hello world', 'es');

        expect(result).to.equal('Hola mundo (cached)');
        expect(TranslationLog.findOne.calledOnce).to.be.true;
        // Should not call external API
        expect(axios.post.called).to.be.false;
      });

      it('should call API when cache miss and save result', async () => {
        // Mock cache miss
        TranslationLog.findOne.resolves(null);
        
        // Mock successful API response
        axios.post.resolves(testData.mockApiResponses.openai.success);

        const result = await textTranslator.translate('Hello world', 'es');

        expect(result).to.equal('Hola mundo');
        expect(TranslationLog.findOne.calledOnce).to.be.true;
        expect(axios.post.calledOnce).to.be.true;
        expect(saveStub.calledOnce).to.be.true;
      });

      it('should query cache with correct parameters', async () => {
        TranslationLog.findOne.resolves(null);
        axios.post.resolves(testData.mockApiResponses.openai.success);

        await textTranslator.translate('Test text', 'fr');

        expect(TranslationLog.findOne.calledWith({
          text: 'Test text',
          lang: 'fr'
        })).to.be.true;
      });
    });

    describe('Provider Selection', () => {
      it('should use configured default translator', () => {
        expect(textTranslator.translatorType).to.equal('openai');
        expect(textTranslator.translator).to.be.instanceOf(OpenAITranslator);
      });

      it('should throw error for invalid translator', () => {
        const originalTranslator = process.env.DEFAULT_TRANSLATOR;
        process.env.DEFAULT_TRANSLATOR = 'invalid';
        
        // Clear require cache to force config reload
        delete require.cache[require.resolve('../config')];
        delete require.cache[require.resolve('../translators/TextTranslator')];
        
        try {
          const TextTranslator = require('../translators/TextTranslator');
          expect(() => new TextTranslator()).to.throw('Invalid default translator specified');
        } finally {
          process.env.DEFAULT_TRANSLATOR = originalTranslator;
          // Clear cache again to restore normal state
          delete require.cache[require.resolve('../config')];
          delete require.cache[require.resolve('../translators/TextTranslator')];
        }
      });
    });

    describe('Error Propagation', () => {
      it('should propagate translation errors', async () => {
        TranslationLog.findOne.resolves(null);
        axios.post.rejects(testData.mockApiResponses.openai.rateLimitError);

        try {
          await textTranslator.translate('Hello world', 'es');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).to.be.instanceOf(TranslationError);
          expect(error.provider).to.equal('OpenAI');
        }
      });
    });
  });

  describe('Translation Performance', () => {
    it('should complete translation within reasonable time', async function() {
      this.timeout(5000); // 5 second timeout

      // Mock fast response
      TranslationLog.findOne.resolves({
        text: 'Hello',
        lang: 'es',
        translated_text: 'Hola'
      });

      const textTranslator = new TextTranslator();
      const startTime = Date.now();

      const result = await textTranslator.translate('Hello', 'es');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).to.equal('Hola');
      expect(duration).to.be.below(1000); // Should complete in under 1 second
    });
  });

  describe('Multiple Language Support', () => {
    it('should handle various language codes', async () => {
      const languages = ['es', 'fr', 'de', 'zh', 'ja', 'en-US', 'pt-BR'];
      const textTranslator = new TextTranslator();

      for (const lang of languages) {
        TranslationLog.findOne.resolves({
          text: 'Hello',
          lang: lang,
          translated_text: `Hello in ${lang}`
        });

        const result = await textTranslator.translate('Hello', lang);
        expect(result).to.equal(`Hello in ${lang}`);
      }
    });
  });

  describe('Concurrent Translation Handling', () => {
    it('should handle multiple simultaneous requests', async () => {
      const textTranslator = new TextTranslator();
      const requests = [];

      // Mock different cached responses
      TranslationLog.findOne.onCall(0).resolves({
        text: 'Hello',
        lang: 'es',
        translated_text: 'Hola'
      });
      TranslationLog.findOne.onCall(1).resolves({
        text: 'Goodbye',
        lang: 'fr',
        translated_text: 'Au revoir'
      });
      TranslationLog.findOne.onCall(2).resolves({
        text: 'Thank you',
        lang: 'de',
        translated_text: 'Danke'
      });

      // Create multiple concurrent requests
      requests.push(textTranslator.translate('Hello', 'es'));
      requests.push(textTranslator.translate('Goodbye', 'fr'));
      requests.push(textTranslator.translate('Thank you', 'de'));

      const results = await Promise.all(requests);

      expect(results).to.have.length(3);
      expect(results[0]).to.equal('Hola');
      expect(results[1]).to.equal('Au revoir');
      expect(results[2]).to.equal('Danke');
    });
  });
}); 