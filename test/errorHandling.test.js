const { expect } = require('chai');
const sinon = require('sinon');
const {
  ApiError,
  ValidationError,
  NotFoundError,
  TranslationError,
  globalErrorHandler,
  successResponse,
  formatErrorResponse
} = require('../utils/errorHandler');

describe('Error Handling System', () => {
  describe('Custom Error Classes', () => {
    describe('ApiError', () => {
      it('should create an ApiError with proper properties', () => {
        const error = new ApiError(400, 'Test error');
        
        expect(error).to.be.instanceOf(Error);
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.equal('Test error');
        expect(error.isOperational).to.be.true;
        expect(error.timestamp).to.be.a('string');
      });

      it('should capture stack trace', () => {
        const error = new ApiError(500, 'Test error');
        
        expect(error.stack).to.be.a('string');
        expect(error.stack).to.include('Test error');
      });
    });

    describe('ValidationError', () => {
      it('should create ValidationError with 400 status', () => {
        const error = new ValidationError('Invalid input');
        
        expect(error.statusCode).to.equal(400);
        expect(error.type).to.equal('VALIDATION_ERROR');
        expect(error.message).to.equal('Invalid input');
      });

      it('should include validation details', () => {
        const details = [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' }
        ];
        const error = new ValidationError('Validation failed', details);
        
        expect(error.details).to.equal(details);
      });
    });

    describe('NotFoundError', () => {
      it('should create NotFoundError with 404 status', () => {
        const error = new NotFoundError('User');
        
        expect(error.statusCode).to.equal(404);
        expect(error.type).to.equal('NOT_FOUND_ERROR');
        expect(error.message).to.equal('User not found');
      });

      it('should use default resource name', () => {
        const error = new NotFoundError();
        
        expect(error.message).to.equal('Resource not found');
      });
    });

    describe('TranslationError', () => {
      it('should create TranslationError with 503 status', () => {
        const error = new TranslationError('OpenAI', 'Rate limit exceeded');
        
        expect(error.statusCode).to.equal(503);
        expect(error.type).to.equal('TRANSLATION_ERROR');
        expect(error.provider).to.equal('OpenAI');
        expect(error.message).to.equal('OpenAI translation service error: Rate limit exceeded');
      });
    });
  });

  describe('Error Response Formatting', () => {
    it('should format error response correctly', () => {
      const error = new ValidationError('Invalid input', [
        { field: 'text', message: 'Text is required' }
      ]);
      
      const response = formatErrorResponse(error);
      
      expect(response).to.have.property('success', false);
      expect(response.error).to.have.property('type', 'VALIDATION_ERROR');
      expect(response.error).to.have.property('message', 'Invalid input');
      expect(response.error).to.have.property('timestamp');
      expect(response.error).to.have.property('details');
      expect(response.error.details).to.be.an('array');
    });

    it('should include stack trace in development', () => {
      const error = new ApiError(500, 'Internal error');
      
      const response = formatErrorResponse(error, true);
      
      expect(response.error).to.have.property('stack');
    });

    it('should not include stack trace in production', () => {
      const error = new ApiError(500, 'Internal error');
      
      const response = formatErrorResponse(error, false);
      
      expect(response.error).to.not.have.property('stack');
    });

    it('should include provider info for translation errors', () => {
      const error = new TranslationError('Google', 'Service unavailable');
      
      const response = formatErrorResponse(error);
      
      expect(response.error).to.have.property('provider', 'Google');
    });
  });

  describe('Global Error Handler', () => {
    let req, res, next, mockLogger;

    beforeEach(() => {
      req = {
        method: 'POST',
        url: '/api/v1/translate',
        ip: '127.0.0.1',
        get: sinon.stub().returns('test-agent'),
        body: { text: 'test' },
        query: {}
      };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      next = sinon.stub();

      // Mock logger to avoid actual logging during tests
      mockLogger = {
        error: sinon.stub()
      };
      
      // Temporarily replace the logger
      const errorHandler = require('../utils/errorHandler');
      const logger = require('../utils/logger');
      sinon.stub(logger, 'error');
    });

    afterEach(() => {
      // Restore logger
      const logger = require('../utils/logger');
      if (logger.error.restore) {
        logger.error.restore();
      }
    });

    it('should handle ApiError properly', () => {
      const error = new ValidationError('Invalid input');
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.called).to.be.true;
      
      const response = res.json.args[0][0];
      expect(response.success).to.be.false;
      expect(response.error.type).to.equal('VALIDATION_ERROR');
    });

    it('should convert non-ApiError to ApiError', () => {
      const error = new Error('Regular error');
      error.statusCode = 500;
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.called).to.be.true;
      
      const response = res.json.args[0][0];
      expect(response.success).to.be.false;
      expect(response.error.message).to.equal('Regular error');
    });

    it('should log error with request context', () => {
      const error = new ValidationError('Invalid input');
      const logger = require('../utils/logger');
      
      globalErrorHandler(error, req, res, next);
      
      expect(logger.error.called).to.be.true;
      const logCall = logger.error.args[0];
      expect(logCall[0]).to.equal('Request error');
      expect(logCall[1]).to.have.property('method', 'POST');
      expect(logCall[1]).to.have.property('url', '/api/v1/translate');
      expect(logCall[1]).to.have.property('ip', '127.0.0.1');
    });

    it('should handle errors without statusCode', () => {
      const error = new Error('Unknown error');
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('Success Response Formatter', () => {
    it('should format success response correctly', () => {
      const data = { translation: 'Hola mundo' };
      const message = 'Translation completed';
      const meta = { processingTime: '100ms' };
      
      const response = successResponse(data, message, meta);
      
      expect(response).to.have.property('success', true);
      expect(response).to.have.property('message', message);
      expect(response).to.have.property('data', data);
      expect(response).to.have.property('timestamp');
      expect(response).to.have.property('meta', meta);
    });

    it('should work without meta parameter', () => {
      const data = { translation: 'Hola mundo' };
      
      const response = successResponse(data);
      
      expect(response).to.have.property('success', true);
      expect(response).to.have.property('message', 'Success');
      expect(response).to.have.property('data', data);
      expect(response).to.not.have.property('meta');
    });

    it('should include timestamp', () => {
      const response = successResponse({ test: 'data' });
      
      expect(response.timestamp).to.be.a('string');
      expect(new Date(response.timestamp)).to.be.instanceOf(Date);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors in middleware chain', () => {
      const req = { body: {} };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      // Simulate validation middleware
      const { validators } = require('../utils/validation');
      validators.stringTranslation(req, res, next);

      // Should call next with ValidationError
      expect(next.calledOnce).to.be.true;
      const error = next.args[0][0];
      expect(error).to.be.instanceOf(ValidationError);
    });

    it('should provide helpful error messages', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'language', message: 'Language code must be a valid ISO language code' },
        { field: 'text', message: 'Text cannot be empty' }
      ]);
      
      const response = formatErrorResponse(error);
      
      expect(response.error.details).to.have.length(2);
      expect(response.error.details[0].field).to.equal('language');
      expect(response.error.details[0].message).to.include('ISO language code');
    });
  });

  describe('Translation Service Error Handling', () => {
    it('should create appropriate errors for different translation failures', () => {
      // OpenAI rate limit
      const rateLimitError = new TranslationError('OpenAI', 'Rate limit exceeded');
      expect(rateLimitError.statusCode).to.equal(503);
      expect(rateLimitError.provider).to.equal('OpenAI');

      // Google service unavailable
      const googleError = new TranslationError('Google', 'Service unavailable');
      expect(googleError.provider).to.equal('Google');

      // HuggingFace API error
      const hfError = new TranslationError('HuggingFace', 'API error: 500');
      expect(hfError.provider).to.equal('HuggingFace');
    });
  });
}); 