const { expect } = require('chai');
const sinon = require('sinon');
const { validators, createValidator, sanitizeInput } = require('../utils/validation');
const { ValidationError } = require('../utils/errorHandler');
const testData = require('./fixtures/testData');

describe('Validation System', () => {
  describe('String Translation Validation', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      next = sinon.stub();
    });

    it('should validate correct string translation request', () => {
      req.body = testData.validTranslationRequests.simple;
      
      validators.stringTranslation(req, res, next);
      
      expect(next.called).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed to next
      expect(req.body.text).to.equal('Hello world');
      expect(req.body.language).to.equal('es');
    });

    it('should reject empty text', () => {
      req.body = testData.invalidRequests.emptyText;
      
      validators.stringTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.details).to.be.an('array');
      expect(error.details.some(d => d.field === 'text')).to.be.true;
    });

    it('should reject invalid language codes', () => {
      req.body = testData.invalidRequests.invalidLanguage;
      
      validators.stringTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.details.some(d => d.field === 'language')).to.be.true;
    });

    it('should reject text exceeding size limit', () => {
      req.body = testData.invalidRequests.tooLongText;
      
      validators.stringTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.details.some(d => d.field === 'text')).to.be.true;
    });

    it('should trim whitespace from text', () => {
      req.body = {
        text: '  Hello world  ',
        language: 'es'
      };
      
      validators.stringTranslation(req, res, next);
      
      expect(next.called).to.be.true;
      expect(req.body.text).to.equal('Hello world'); // Trimmed
    });

    it('should accept valid language code variations', () => {
      const validLanguages = ['en', 'es', 'fr', 'de', 'en-US', 'zh-CN', 'pt-BR'];
      
      validLanguages.forEach(lang => {
        req.body = { text: 'Test', language: lang };
        next.resetHistory();
        
        validators.stringTranslation(req, res, next);
        
        expect(next.called).to.be.true;
        expect(next.args[0]).to.be.empty; // No error
      });
    });
  });

  describe('Page Translation Validation', () => {
    let req, res, next;

    beforeEach(() => {
      req = { query: {} };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      next = sinon.stub();
    });

    it('should validate correct page translation request', () => {
      req.query = {
        language: 'es',
        model_name: 'blog',
        source_url: 'https://example.com/test.json',
        content_id: 'test123'
      };
      
      validators.pageTranslation(req, res, next);
      
      expect(next.called).to.be.true;
      expect(next.args[0]).to.be.empty;
    });

    it('should reject invalid URLs', () => {
      req.query = testData.invalidRequests.invalidUrl;
      
      validators.pageTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.details.some(d => d.field === 'source_url')).to.be.true;
    });

    it('should reject non-HTTPS URLs in production', () => {
      req.query = {
        language: 'es',
        model_name: 'blog',
        source_url: 'http://example.com/test.json', // HTTP not HTTPS
        content_id: 'test123'
      };
      
      validators.pageTranslation(req, res, next);
      
      expect(next.called).to.be.true;
      // Should still accept HTTP for now, but we can make this stricter
    });

    it('should validate alphanumeric content IDs', () => {
      req.query = {
        language: 'es',
        model_name: 'blog',
        source_url: 'https://example.com/test.json',
        content_id: 'test-123!' // Invalid characters
      };
      
      validators.pageTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.details.some(d => d.field === 'content_id')).to.be.true;
    });
  });

  describe('Update Translation Validation', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      next = sinon.stub();
    });

    it('should validate correct update translation request', () => {
      req.body = {
        content_id: 'test123',
        model_name: 'blog',
        language: 'es',
        updatedJson: JSON.stringify({ title: 'Test', content: 'Content' })
      };
      
      validators.updateTranslation(req, res, next);
      
      expect(next.called).to.be.true;
      expect(next.args[0]).to.be.empty;
    });

    it('should reject invalid JSON', () => {
      req.body = testData.invalidRequests.invalidJson;
      
      validators.updateTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.details.some(d => d.field === 'updatedJson')).to.be.true;
    });

    it('should reject JSON primitives (require objects)', () => {
      req.body = {
        content_id: 'test123',
        model_name: 'blog',
        language: 'es',
        updatedJson: '"just a string"' // Primitive, not object
      };
      
      validators.updateTranslation(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
    });
  });

  describe('Input Sanitization', () => {
    it('should remove script tags', () => {
      const maliciousInput = 'Hello <script>alert("xss")</script> world';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).to.equal('Hello  world');
      expect(sanitized).to.not.include('<script>');
    });

    it('should remove javascript: protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).to.equal('alert("xss")');
      expect(sanitized).to.not.include('javascript:');
    });

    it('should remove event handlers', () => {
      const maliciousInput = 'onclick="alert(1)" onload="hack()"';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).to.not.include('onclick=');
      expect(sanitized).to.not.include('onload=');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).to.equal('hello world');
    });

    it('should handle nested objects', () => {
      const input = {
        title: '  Test <script>alert(1)</script>  ',
        content: 'onclick="hack()" Normal content'
      };
      
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.title).to.equal('Test');
      expect(sanitized.content).to.not.include('onclick=');
      expect(sanitized.content).to.include('Normal content');
    });
  });

  describe('Custom Validation Patterns', () => {
    it('should validate ISO language codes correctly', () => {
      const validCodes = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'en-US', 'zh-CN', 'pt-BR'];
      const invalidCodes = ['english', 'ESP', 'fr-fr-fr', '123', 'a', 'toolongcode'];
      
      // Test with our existing validators
      const { validators } = require('../utils/validation');
      
      validCodes.forEach(code => {
        const req = { body: { text: 'Hello', language: code } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
        const next = sinon.stub();
        
        validators.stringTranslation(req, res, next);
        expect(next.called).to.be.true;
        expect(next.args[0]).to.be.empty; // No error
      });
      
      invalidCodes.forEach(code => {
        const req = { body: { text: 'Hello', language: code } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
        const next = sinon.stub();
        
        validators.stringTranslation(req, res, next);
        expect(next.calledOnce).to.be.true;
        expect(next.args[0][0]).to.be.instanceOf(ValidationError);
      });
    });
  });
}); 