const TextTranslator = require('../translators/TextTranslator');
const PlaceholderSafeTranslator = require('../translators/PlaceholderSafeTranslator');
const OpenAITranslator = require('../translators/OpenAITranslator');
const GoogleTranslator = require('../translators/GoogleTranslator');
const TranslationLog = require('../models/TranslationLog');
const stringHelpers = require('../helpers/stringHelpers');
const TranslationConfigService = require('../services/TranslationConfigService'); // Import
const config = require('../config');
const { expect } = require('chai');

jest.mock('../translators/OpenAITranslator');
jest.mock('../translators/GoogleTranslator');
jest.mock('../translators/PlaceholderSafeTranslator');
jest.mock('../models/TranslationLog');
jest.mock('../services/TranslationConfigService'); // Mock TranslationConfigService

describe('TextTranslator', () => {
  let textTranslator;
  let mockOpenAITranslatorInstance;
  let mockTranslationConfigServiceInstance;

  beforeEach(() => {
    OpenAITranslator.mockClear();
    GoogleTranslator.mockClear();
    PlaceholderSafeTranslator.mockClear();
    TranslationLog.findOne.mockReset();
    TranslationLog.findOneAndUpdate.mockReset();
    TranslationConfigService.mockClear(); // Clear mock for TranslationConfigService

    // Mock TranslationConfigService instance and its methods
    mockTranslationConfigServiceInstance = {
      shouldPreserveFormatting: jest.fn().mockResolvedValue(true), // Default to true for PST path
      initialize: jest.fn().mockResolvedValue(undefined), // Mock initialize
      initialized: true, // Assume it's initialized
    };
    TranslationConfigService.mockImplementation(() => mockTranslationConfigServiceInstance);

    config.translation.defaultProvider = 'openai';
    textTranslator = new TextTranslator();

    if (OpenAITranslator.mock.instances.length > 0) {
      mockOpenAITranslatorInstance = OpenAITranslator.mock.instances[0];
    } else {
      mockOpenAITranslatorInstance = { translate: jest.fn() };
    }

    TranslationLog.findOne.mockResolvedValue(null);
    TranslationLog.findOneAndUpdate.mockResolvedValue({});

    // Spy on stringHelpers.textNeedsSpecialHandling and stringHelpers.tokenizeString for specific tests
    // but restore them after each test to avoid interference.
    jest.spyOn(stringHelpers, 'textNeedsSpecialHandling');
    jest.spyOn(stringHelpers, 'tokenizeString');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to simplify translate calls in tests
  const callTranslate = (originalString, key = 'testKey', custId = 'default') => {
    return textTranslator.translate(originalString, 'es', false, key, custId);
  };

  it('should use PlaceholderSafeTranslator if config says preserve, content needs it, and provider is compatible', async () => {
    const originalString = "Hello {{name}} <p>world</p>!";
    const expectedTranslation = "Hola {{name}} <p>mundo</p>!";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(true);
    // textNeedsSpecialHandling will be called with the string by the real implementation.

    const mockPSTTranslate = jest.fn().mockResolvedValue(expectedTranslation);
    PlaceholderSafeTranslator.mockImplementation(() => ({
      translatePreservingPlaceholders: mockPSTTranslate,
    }));

    const translatedText = await callTranslate(originalString);

    expect(mockTranslationConfigServiceInstance.shouldPreserveFormatting).toHaveBeenCalledWith('testKey', originalString, 'default');
    expect(stringHelpers.textNeedsSpecialHandling).toHaveBeenCalledWith(originalString);
    expect(PlaceholderSafeTranslator).toHaveBeenCalledTimes(1);
    expect(PlaceholderSafeTranslator).toHaveBeenCalledWith(mockOpenAITranslatorInstance);

    const { tokenizedString, tokenMap } = stringHelpers.tokenizeString(originalString); // get actual tokens
    expect(mockPSTTranslate).toHaveBeenCalledWith(tokenizedString, tokenMap, 'es');
    expect(translatedText).to.equal(expectedTranslation);
    if (mockOpenAITranslatorInstance.translate.mock) { // Check if it's a Jest mock
        expect(mockOpenAITranslatorInstance.translate).not.toHaveBeenCalled();
    }
  });

  it('should use standard translator if config says NOT to preserve', async () => {
    const originalString = "Hello {{name}} <p>world</p>!";
    const expectedTranslation = "Hola {{name}} <p>mundo</p>! (standard)";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(false);
    if (mockOpenAITranslatorInstance.translate.mockResolvedValue) {
         mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedTranslation);
    }


    const translatedText = await callTranslate(originalString);

    expect(mockTranslationConfigServiceInstance.shouldPreserveFormatting).toHaveBeenCalledWith('testKey', originalString, 'default');
    expect(stringHelpers.textNeedsSpecialHandling).toHaveBeenCalledWith(originalString); // Still called to check content
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    if (mockOpenAITranslatorInstance.translate.mock) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, 'es');
    }
    expect(translatedText).to.equal(expectedTranslation);
  });

  it('should use standard translator if content does NOT need special handling, even if config says preserve', async () => {
    const originalString = "Hello world"; // Plain text
    const expectedTranslation = "Hola mundo (standard)";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(true);
    // stringHelpers.textNeedsSpecialHandling will return false for "Hello world"
    if (mockOpenAITranslatorInstance.translate.mockResolvedValue) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedTranslation);
    }

    const translatedText = await callTranslate(originalString);

    expect(mockTranslationConfigServiceInstance.shouldPreserveFormatting).toHaveBeenCalledWith('testKey', originalString, 'default');
    expect(stringHelpers.textNeedsSpecialHandling).toHaveBeenCalledWith(originalString);
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
     if (mockOpenAITranslatorInstance.translate.mock) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, 'es');
    }
    expect(translatedText).to.equal(expectedTranslation);
  });

  it('should use standard translator if provider is not compatible, even if config and content say so', async () => {
    config.translation.defaultProvider = 'google'; // Non-compatible for PST path
    const mockGoogleInstance = { translate: jest.fn() };
    GoogleTranslator.mockImplementation(() => mockGoogleInstance);
    textTranslator = new TextTranslator(); // Re-initialize with Google

    const originalString = "Hello {{name}}!";
    const expectedTranslation = "Hola {{name}}! (google)";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(true);
    // stringHelpers.textNeedsSpecialHandling will return true
    mockGoogleInstance.translate.mockResolvedValue(expectedTranslation);

    const translatedText = await callTranslate(originalString);

    expect(mockTranslationConfigServiceInstance.shouldPreserveFormatting).toHaveBeenCalledWith('testKey', originalString, 'default');
    expect(stringHelpers.textNeedsSpecialHandling).toHaveBeenCalledWith(originalString);
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    expect(mockGoogleInstance.translate).toHaveBeenCalledWith(originalString, 'es');
    expect(translatedText).to.equal(expectedTranslation);
  });

  it('should use standard translation if config and content allow PST, but tokenizeString returns empty map', async () => {
    const originalString = "<br/>"; // A string that needs special handling
    const expectedTranslation = "<br/> (translated)";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(true);

    // Force tokenizeString to return an empty map for this specific input for this test
    stringHelpers.tokenizeString.mockReturnValueOnce({ tokenizedString: originalString, tokenMap: {} });

    if (mockOpenAITranslatorInstance.translate.mockResolvedValue) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedTranslation);
    }

    const translatedText = await callTranslate(originalString);

    expect(stringHelpers.tokenizeString).toHaveBeenCalledWith(originalString);
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled(); // PST constructor not called
    if (mockOpenAITranslatorInstance.translate.mock) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, 'es');
    }
    expect(translatedText).to.equal(expectedTranslation);
  });

  it('should correctly pass key and customerId to shouldPreserveFormatting', async () => {
    const originalString = "Test string {{placeholder}}";
    const customKey = "my.custom.key";
    const customCustId = "customerX";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(false); // Force standard path
     if (mockOpenAITranslatorInstance.translate.mockResolvedValue) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue("Translated");
    }

    await callTranslate(originalString, customKey, customCustId);
    expect(mockTranslationConfigServiceInstance.shouldPreserveFormatting).toHaveBeenCalledWith(customKey, originalString, customCustId);
  });

  // Keep existing tests for caching, general fallback (PST failure), etc., updating signatures as needed.
  it('PST FALLBACK: should fallback to standard translation if PlaceholderSafeTranslator fails', async () => {
    const originalString = "Fallback test {{placeholder}}";
    const expectedFallbackTranslation = "Test di fallback {{placeholder}}";
    mockTranslationConfigServiceInstance.shouldPreserveFormatting.mockResolvedValue(true);
    // textNeedsSpecialHandling will be true

    PlaceholderSafeTranslator.mockImplementation(() => ({
      translatePreservingPlaceholders: jest.fn().mockRejectedValue(new Error("PST Error")),
    }));
    if (mockOpenAITranslatorInstance.translate.mockResolvedValue) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedFallbackTranslation);
    }


    const translatedText = await callTranslate(originalString);

    expect(PlaceholderSafeTranslator).toHaveBeenCalledTimes(1);
    if (mockOpenAITranslatorInstance.translate.mock) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, 'es');
    }
    expect(translatedText).to.equal(expectedFallbackTranslation);
  });

  it('CACHE: should use cache if available, regardless of config or content', async () => {
    const originalString = "Cached <p>{{item}}</p>";
    const cachedTranslation = "Cacheado <p>{{item}}</p>";
    TranslationLog.findOne.mockResolvedValue({ text: originalString, lang: 'es', translated_text: cachedTranslation });

    const translatedText = await callTranslate(originalString);

    expect(translatedText).to.equal(cachedTranslation);
    expect(mockTranslationConfigServiceInstance.shouldPreserveFormatting).not.toHaveBeenCalled();
    expect(stringHelpers.textNeedsSpecialHandling).not.toHaveBeenCalled();
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    if (mockOpenAITranslatorInstance.translate.mock) {
        expect(mockOpenAITranslatorInstance.translate).not.toHaveBeenCalled();
    }
    expect(TranslationLog.findOne).toHaveBeenCalledWith({ text: originalString, lang: 'es' });
  });

});
