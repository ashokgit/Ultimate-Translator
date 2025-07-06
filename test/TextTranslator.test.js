const TextTranslator = require('../translators/TextTranslator');
const PlaceholderSafeTranslator = require('../translators/PlaceholderSafeTranslator');
const OpenAITranslator = require('../translators/OpenAITranslator');
const GoogleTranslator = require('../translators/GoogleTranslator'); // For fallback tests
const TranslationLog = require('../models/TranslationLog');
const stringHelpers = require('../helpers/stringHelpers'); // Import the whole module
const config = require('../config');
const { expect } = require('chai'); // Using Chai for assertions as per other files

// Mock underlying translators and services
jest.mock('../translators/OpenAITranslator');
jest.mock('../translators/GoogleTranslator');
jest.mock('../translators/PlaceholderSafeTranslator'); // Will mock its constructor and methods
jest.mock('../models/TranslationLog');

describe('TextTranslator', () => {
  let textTranslator;
  let mockOpenAITranslatorInstance;
  // mockPlaceholderSafeTranslatorInstance will be set if constructor is called

  beforeEach(() => {
    OpenAITranslator.mockClear();
    GoogleTranslator.mockClear();
    PlaceholderSafeTranslator.mockClear(); // Clears constructor mock and instances
    TranslationLog.findOne.mockReset();
    TranslationLog.findOneAndUpdate.mockReset();

    config.translation.defaultProvider = 'openai';
    textTranslator = new TextTranslator();

    if (OpenAITranslator.mock.instances.length > 0) {
      mockOpenAITranslatorInstance = OpenAITranslator.mock.instances[0];
    } else {
      // This case should ideally not happen if TextTranslator constructor works
      // For safety, create a dummy mock if OpenAITranslator wasn't instantiated
      mockOpenAITranslatorInstance = { translate: jest.fn() };
    }

    TranslationLog.findOne.mockResolvedValue(null);
    TranslationLog.findOneAndUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear Jest mocks
    // Restore any spied objects if stringHelpers was spied upon
    jest.restoreAllMocks();
  });

  it('should use PlaceholderSafeTranslator for strings with placeholders', async () => {
    const originalString = "Hello {{name}}!";
    const targetLanguage = 'es';
    const expectedTranslation = "Hola {{name}}!";
    const mockPSTTranslate = jest.fn().mockResolvedValue(expectedTranslation);
    PlaceholderSafeTranslator.mockImplementation(() => ({
      translatePreservingPlaceholders: mockPSTTranslate,
    }));

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(PlaceholderSafeTranslator).toHaveBeenCalledTimes(1);
    expect(PlaceholderSafeTranslator).toHaveBeenCalledWith(mockOpenAITranslatorInstance);
    const { tokenizedString, tokenMap } = stringHelpers.tokenizeString(originalString);
    expect(mockPSTTranslate).toHaveBeenCalledWith(tokenizedString, tokenMap, targetLanguage);
    expect(translatedText).to.equal(expectedTranslation);
    if(mockOpenAITranslatorInstance.translate) { // Ensure method exists before checking calls
        expect(mockOpenAITranslatorInstance.translate).not.toHaveBeenCalled();
    }
  });

  it('should use PlaceholderSafeTranslator for strings with HTML tags', async () => {
    const originalString = "<p>Hello <strong>world</strong></p>";
    const targetLanguage = 'es';
    const expectedTranslation = "<p>Hola <strong>mundo</strong></p>"; // PST will restore tags
    const mockPSTTranslate = jest.fn().mockResolvedValue(expectedTranslation);
    PlaceholderSafeTranslator.mockImplementation(() => ({
      translatePreservingPlaceholders: mockPSTTranslate,
    }));

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(PlaceholderSafeTranslator).toHaveBeenCalledTimes(1);
    const { tokenizedString, tokenMap } = stringHelpers.tokenizeString(originalString);
    expect(mockPSTTranslate).toHaveBeenCalledWith(tokenizedString, tokenMap, targetLanguage);
    expect(translatedText).to.equal(expectedTranslation);
    if(mockOpenAITranslatorInstance.translate) {
        expect(mockOpenAITranslatorInstance.translate).not.toHaveBeenCalled();
    }
  });

  it('should use PlaceholderSafeTranslator for mixed HTML and placeholders', async () => {
    const originalString = "<p>User: {{username}}</p>";
    const targetLanguage = 'fr';
    const expectedTranslation = "<p>Utilisateur: {{username}}</p>";
    const mockPSTTranslate = jest.fn().mockResolvedValue(expectedTranslation);
    PlaceholderSafeTranslator.mockImplementation(() => ({
      translatePreservingPlaceholders: mockPSTTranslate,
    }));

    const translatedText = await textTranslator.translate(originalString, targetLanguage);
    expect(PlaceholderSafeTranslator).toHaveBeenCalledTimes(1);
    const { tokenizedString, tokenMap } = stringHelpers.tokenizeString(originalString);
    expect(mockPSTTranslate).toHaveBeenCalledWith(tokenizedString, tokenMap, targetLanguage);
    expect(translatedText).to.equal(expectedTranslation);
  });


  it('should use standard translator if no placeholders or HTML tags are detected', async () => {
    const originalString = "Hello world"; // No placeholders or HTML
    const targetLanguage = 'fr';
    const expectedTranslation = "Bonjour le monde";
    if(mockOpenAITranslatorInstance.translate) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedTranslation);
    }


    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    if(mockOpenAITranslatorInstance.translate) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledTimes(1);
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, targetLanguage);
    }
    expect(translatedText).to.equal(expectedTranslation);
  });

  it('should not use PlaceholderSafeTranslator for strings with only escaped placeholders', async () => {
    const originalString = "This is \\{{name}} and \\<strong>bold\\</strong>";
    const targetLanguage = 'es';
    const expectedTranslation = "Esto es \\{{name}} y \\<strong>bold\\</strong>"; // Assuming direct translation
     if(mockOpenAITranslatorInstance.translate) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedTranslation);
    }

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
     if(mockOpenAITranslatorInstance.translate) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, targetLanguage);
    }
    expect(translatedText).to.equal(expectedTranslation);
  });


  it('should use standard translator if special content present but provider is not OpenAI (or compatible LLM)', async () => {
    config.translation.defaultProvider = 'google';
    const mockGoogleInstance = { translate: jest.fn() };
    GoogleTranslator.mockImplementation(() => mockGoogleInstance);
    textTranslator = new TextTranslator(); // Re-initialize with Google

    const originalString = "Hello {{name}} to Google!";
    const targetLanguage = 'de';
    const expectedTranslation = "Hallo {{name}} zu Google!";
    mockGoogleInstance.translate.mockResolvedValue(expectedTranslation);

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    expect(mockGoogleInstance.translate).toHaveBeenCalledWith(originalString, targetLanguage);
    expect(translatedText).to.equal(expectedTranslation);
  });

  it('should fallback to standard translation if PlaceholderSafeTranslator fails', async () => {
    const originalString = "Fallback test {{placeholder}}";
    const targetLanguage = 'it';
    const expectedFallbackTranslation = "Test di fallback {{placeholder}}";
    PlaceholderSafeTranslator.mockImplementation(() => ({
      translatePreservingPlaceholders: jest.fn().mockRejectedValue(new Error("PST Error")),
    }));
     if(mockOpenAITranslatorInstance.translate) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedFallbackTranslation);
    }

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(PlaceholderSafeTranslator).toHaveBeenCalledTimes(1);
    if(mockOpenAITranslatorInstance.translate) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, targetLanguage);
    }
    expect(translatedText).to.equal(expectedFallbackTranslation);
  });

  it('should use cache if available, even with special content', async () => {
    const originalString = "Cached <p>{{item}}</p>";
    const targetLanguage = 'es';
    const cachedTranslation = "Cacheado <p>{{item}}</p>";
    TranslationLog.findOne.mockResolvedValue({ text: originalString, lang: targetLanguage, translated_text: cachedTranslation });

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(translatedText).to.equal(cachedTranslation);
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    if(mockOpenAITranslatorInstance.translate) {
        expect(mockOpenAITranslatorInstance.translate).not.toHaveBeenCalled();
    }
    expect(TranslationLog.findOne).toHaveBeenCalledWith({ text: originalString, lang: targetLanguage });
  });

  it('should use standard translation if comprehensiveDetectionRegex matches but tokenizeString returns empty map', async () => {
    const originalString = "<br/>"; // This will be tokenized by the actual tokenizeString
    const targetLanguage = 'fr';
    const expectedTranslation = "<br/> (translated)";

    // Spy on stringHelpers.tokenizeString and force it to return an empty map for this specific input
    const tokenizeSpy = jest.spyOn(stringHelpers, 'tokenizeString').mockReturnValue({
      tokenizedString: originalString,
      tokenMap: {}
    });

    if(mockOpenAITranslatorInstance.translate) {
        mockOpenAITranslatorInstance.translate.mockResolvedValue(expectedTranslation);
    }

    const translatedText = await textTranslator.translate(originalString, targetLanguage);

    expect(tokenizeSpy).toHaveBeenCalledWith(originalString);
    // PlaceholderSafeTranslator constructor should not be called if tokenMap is empty directly after tokenizeString
    // The current logic in TextTranslator.js:
    // if (needsSpecialHandling && this.translator instanceof OpenAITranslator) {
    //   const { tokenizedString, tokenMap } = tokenizeString(originalString);
    //   if (Object.keys(tokenMap).length > 0) {
    //     const safeTranslator = new PlaceholderSafeTranslator(this.translator); <--- THIS LINE
    //     ...
    // So, PlaceholderSafeTranslator constructor itself won't be called.
    expect(PlaceholderSafeTranslator).not.toHaveBeenCalled();
    if(mockOpenAITranslatorInstance.translate) {
        expect(mockOpenAITranslatorInstance.translate).toHaveBeenCalledWith(originalString, targetLanguage);
    }
    expect(translatedText).to.equal(expectedTranslation);

    tokenizeSpy.mockRestore();
  });
});
