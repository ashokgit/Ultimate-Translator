const { expect } = require('chai');
const apiKeyValidations = require('../validations/apiKeyValidate');

describe('API Key Update Validation', () => {
  describe('updateApiKeySchema', () => {
    it('should validate a correct update request', () => {
      const validData = {
        name: "Updated Testing",
        description: "Updated OpenAI",
        isActive: true,
        apiKey: "sk-test1234567890123456789012345678901234567890"
      };

      const { error } = apiKeyValidations.updateApiKeySchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should validate update request without apiKey', () => {
      const validData = {
        name: "Updated Testing",
        description: "Updated OpenAI",
        isActive: true
      };

      const { error } = apiKeyValidations.updateApiKeySchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should reject apiKey that is too short', () => {
      const invalidData = {
        name: "Testing",
        description: "OpenAI",
        isActive: true,
        apiKey: "test" // Only 4 characters, should be at least 10
      };

      const { error } = apiKeyValidations.updateApiKeySchema.validate(invalidData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].message).to.include('at least 10 characters');
    });

    it('should accept valid apiKey length', () => {
      const validData = {
        name: "Testing",
        description: "OpenAI",
        isActive: true,
        apiKey: "sk-test1234567890123456789012345678901234567890" // 50 characters
      };

      const { error } = apiKeyValidations.updateApiKeySchema.validate(validData);
      expect(error).to.be.undefined;
    });

    it('should reject apiKey that is too long', () => {
      const invalidData = {
        name: "Testing",
        description: "OpenAI",
        isActive: true,
        apiKey: "a".repeat(1001) // 1001 characters, should be max 1000
      };

      const { error } = apiKeyValidations.updateApiKeySchema.validate(invalidData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].message).to.include('cannot exceed 1000 characters');
    });

    it('should validate the original request data that was failing', () => {
      const originalData = {
        name: "Testing",
        description: "OpenAI",
        isActive: true,
        apiKey: "test" // This should fail validation
      };

      const { error } = apiKeyValidations.updateApiKeySchema.validate(originalData);
      expect(error).to.not.be.undefined;
      expect(error.details[0].field).to.equal('apiKey');
      expect(error.details[0].message).to.include('at least 10 characters');
    });
  });
}); 