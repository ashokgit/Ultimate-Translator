const fs = require('fs').promises;
const path = require('path');
const TranslationConfigService = require('../services/TranslationConfigService');
const logger = require('../utils/logger');

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));
jest.mock('../utils/logger');

describe('TranslationConfigService', () => {
  let service;
  const mockConfigPath = path.join(__dirname, '../config/translation-rules.json');
  const globalDefaultPreserveFormatting = false; // As set in the service

  beforeEach(() => {
    // Reset mocks for each test
    fs.readFile.mockReset();
    logger.warn.mockReset();
    logger.debug.mockReset();

    service = new TranslationConfigService();
    // Manually set initialized to true to bypass async initialize() for most tests,
    // or mock readFile to return a valid config.
    // For shouldPreserveFormatting, initialize() will be called if not ready.
  });

  describe('shouldPreserveFormatting', () => {
    it('should return true if a matching rule sets preserveFormattingAndPlaceholders to true', async () => {
      const mockConfig = {
        rules: [
          { id: 'rule1', type: 'key_exact', pattern: 'title', preserveFormattingAndPlaceholders: true, action: 'translate' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await service.initialize(); // Initialize with mock config

      const result = await service.shouldPreserveFormatting('title', 'Some Title', 'default');
      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("Matching rule found"), expect.anything());
    });

    it('should return false if a matching rule sets preserveFormattingAndPlaceholders to false', async () => {
      const mockConfig = {
        rules: [
          { id: 'rule1', type: 'key_exact', pattern: 'description', preserveFormattingAndPlaceholders: false, action: 'translate' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await service.initialize();

      const result = await service.shouldPreserveFormatting('description', 'Some Desc', 'default');
      expect(result).toBe(false);
    });

    it('should return global default (false) if matching rule is missing the flag', async () => {
      const mockConfig = {
        rules: [
          { id: 'rule1', type: 'key_pattern', pattern: 'legacy_.+', action: 'translate' }, // Flag missing
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await service.initialize();

      const result = await service.shouldPreserveFormatting('legacy_field', 'Some Value', 'default');
      expect(result).toBe(globalDefaultPreserveFormatting);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("flag missing on matched rule"), expect.anything());
    });

    it('should return global default (false) if no rule matches', async () => {
      const mockConfig = {
        rules: [
          { id: 'rule1', type: 'key_exact', pattern: 'specific_key', preserveFormattingAndPlaceholders: true, action: 'translate' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await service.initialize();

      const result = await service.shouldPreserveFormatting('another_key', 'Some Value', 'default');
      expect(result).toBe(globalDefaultPreserveFormatting);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("No specific rule matched"), expect.anything());
    });

    it('should return global default (false) if no rules are defined for the customer', async () => {
      const mockConfig = {
        customerOverrides: {
          "customer1": { rules: [] } // No rules for customer1
        }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await service.initialize();

      // Test with a customer that has an empty rules array
      let result = await service.shouldPreserveFormatting('any_key', 'Any Value', 'customer1');
      expect(result).toBe(globalDefaultPreserveFormatting);
      // This path might log "No rules found for customer" or "No specific rule matched"
      // depending on how configCache is populated and structured after load.
      // The current implementation of shouldPreserveFormatting would log "No rules found for customer..."
      // if configToUse.rules is undefined or not an array.
      // If configToUse.rules is an empty array, it will log "No specific rule matched...".
      // Let's assume it results in "No specific rule matched" after loading empty rules array.
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("No specific rule matched"), expect.objectContaining({ customerId: 'customer1'}));


      // Test with a customer not in overrides, falling back to default which might have no rules.
      // To ensure default has no rules for this test:
      const mockDefaultNoRules = { rules: [] };
      fs.readFile.mockResolvedValue(JSON.stringify(mockDefaultNoRules)); // Default config has no rules
      service = new TranslationConfigService(); // Re-instantiate for fresh config load
      await service.initialize();

      result = await service.shouldPreserveFormatting('any_key', 'Any Value', 'customer_not_in_overrides');
      expect(result).toBe(globalDefaultPreserveFormatting);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("No specific rule matched"), expect.objectContaining({ customerId: 'customer_not_in_overrides'}));
    });

    it('should use customer-specific rules if available', async () => {
      const mockConfig = {
        rules: [ // Default rules
            { id: 'default_rule', type: 'key_exact', pattern: 'title', preserveFormattingAndPlaceholders: false, action: 'translate' }
        ],
        customerOverrides: {
          "customer1": {
            rules: [
              { id: 'cust1_rule', type: 'key_exact', pattern: 'title', preserveFormattingAndPlaceholders: true, action: 'translate' }
            ]
          }
        }
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      service = new TranslationConfigService(); // Re-instantiate for fresh config load
      await service.initialize();

      // Customer1 should get true
      let resultCust1 = await service.shouldPreserveFormatting('title', 'Test', 'customer1');
      expect(resultCust1).toBe(true);

      // Default customer should get false
      let resultDefault = await service.shouldPreserveFormatting('title', 'Test', 'default');
      expect(resultDefault).toBe(false);
    });

    it('should correctly match using key_pattern', async () => {
        const mockConfig = {
            rules: [
              { id: 'rule_pattern', type: 'key_pattern', pattern: '_description$', preserveFormattingAndPlaceholders: true, action: 'translate' },
            ],
          };
          fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
          await service.initialize();

          const result = await service.shouldPreserveFormatting('product_description', 'Details here', 'default');
          expect(result).toBe(true);
          const resultNonMatch = await service.shouldPreserveFormatting('product_title', 'Title', 'default');
          expect(resultNonMatch).toBe(globalDefaultPreserveFormatting);
    });

    // Test for content_type rule if a simple value match is intended
    it('should correctly match using content_type (simple value regex)', async () => {
        const mockConfig = {
            rules: [
              { id: 'rule_content', type: 'content_type', pattern: '^MARKDOWN:', preserveFormattingAndPlaceholders: true, action: 'translate' },
            ],
          };
          fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
          await service.initialize();

          const result = await service.shouldPreserveFormatting('notes', 'MARKDOWN:This is *markdown*', 'default');
          expect(result).toBe(true);
          const resultNonMatch = await service.shouldPreserveFormatting('notes', 'Plain text', 'default');
          expect(resultNonMatch).toBe(globalDefaultPreserveFormatting);
    });

  });
});
