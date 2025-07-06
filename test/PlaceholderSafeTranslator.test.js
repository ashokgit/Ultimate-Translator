const PlaceholderSafeTranslator = require('../translators/PlaceholderSafeTranslator');
const { tokenizeString, detokenizeString } = require('../helpers/stringHelpers');

// Mock the LLM translator
const mockLlmTranslator = {
  translate: jest.fn(),
  // translateWithPrompt: jest.fn() // If we were using this
};

describe('PlaceholderSafeTranslator', () => {
  let safeTranslator;

  beforeEach(() => {
    // Reset mocks before each test
    mockLlmTranslator.translate.mockReset();
    safeTranslator = new PlaceholderSafeTranslator(mockLlmTranslator);
  });

  it('should correctly translate a string with placeholders, preserving them', async () => {
    const originalString = "Hello {{name}}, welcome to %location!";
    const targetLanguage = 'es';
    const { tokenizedString, tokenMap } = tokenizeString(originalString);
    // tokenizedString should be "Hello TOKEN_0, welcome to TOKEN_1!"
    // tokenMap should be { "TOKEN_0": "{{name}}", "TOKEN_1": "%location" }

    // Mock the LLM's response to the tokenized string
    // LLM is expected to translate "Hello TOKEN_0, welcome to TOKEN_1!" to Spanish
    mockLlmTranslator.translate.mockResolvedValue("Hola TOKEN_0, bienvenido a TOKEN_1!");

    const translatedString = await safeTranslator.translatePreservingPlaceholders(
      tokenizedString,
      tokenMap,
      targetLanguage
    );

    // Check if the LLM translator was called correctly
    expect(mockLlmTranslator.translate).toHaveBeenCalledTimes(1);
    expect(mockLlmTranslator.translate).toHaveBeenCalledWith(tokenizedString, targetLanguage);

    // Check if the final string has placeholders restored
    expect(translatedString).toBe("Hola {{name}}, bienvenido a %location!");
  });

  it('should handle strings with no placeholders gracefully (though TextTranslator might bypass it)', async () => {
    const originalString = "Hello world";
    const targetLanguage = 'fr';
    const { tokenizedString, tokenMap } = tokenizeString(originalString);
    // tokenizedString should be "Hello world"
    // tokenMap should be {}

    mockLlmTranslator.translate.mockResolvedValue("Bonjour le monde");

    const translatedString = await safeTranslator.translatePreservingPlaceholders(
      tokenizedString,
      tokenMap,
      targetLanguage
    );

    expect(mockLlmTranslator.translate).toHaveBeenCalledTimes(1);
    expect(mockLlmTranslator.translate).toHaveBeenCalledWith(originalString, targetLanguage); // tokenizedString is originalString here
    expect(translatedString).toBe("Bonjour le monde");
  });

  it('should handle LLM translation errors and re-throw them', async () => {
    const originalString = "Error test {placeholder}";
    const targetLanguage = 'de';
    const { tokenizedString, tokenMap } = tokenizeString(originalString);
    const errorMessage = "LLM API Error";

    mockLlmTranslator.translate.mockRejectedValue(new Error(errorMessage));

    await expect(
      safeTranslator.translatePreservingPlaceholders(tokenizedString, tokenMap, targetLanguage)
    ).rejects.toThrow(errorMessage);

    expect(mockLlmTranslator.translate).toHaveBeenCalledTimes(1);
  });

  it('should correctly handle multiple occurrences of the same placeholder', async () => {
    const originalString = "Test {var} and {var} again.";
    const targetLanguage = 'it';
    const { tokenizedString, tokenMap } = tokenizeString(originalString);
    // tokenizedString should be "Test TOKEN_0 and TOKEN_0 again."
    // tokenMap should be { "TOKEN_0": "{var}" }

    mockLlmTranslator.translate.mockResolvedValue("Prova TOKEN_0 e TOKEN_0 di nuovo.");

    const translatedString = await safeTranslator.translatePreservingPlaceholders(
      tokenizedString,
      tokenMap,
      targetLanguage
    );
    expect(mockLlmTranslator.translate).toHaveBeenCalledWith(tokenizedString, targetLanguage);
    expect(translatedString).toBe("Prova {var} e {var} di nuovo.");
  });

  it('should handle complex nested-like placeholders if regex matches them as single units', async () => {
    // Note: Current regex `/{{\s*\w+\s*}}|{(\w+)}|%\w+/g` doesn't inherently handle nesting like {{ {{var}} }}
    // It would treat `{{var}}` as a token. If the string was `{{ outer_{{inner}} }}`, it depends on how the regex engine parses this.
    // Assuming `{{data}}` is a placeholder.
    const originalString = "Value: {{data}}";
    const targetLanguage = 'ja';
    const { tokenizedString, tokenMap } = tokenizeString(originalString);
    // tokenizedString: "Value: TOKEN_0"
    // tokenMap: { "TOKEN_0": "{{data}}" }

    mockLlmTranslator.translate.mockResolvedValue("値: TOKEN_0");

    const translatedString = await safeTranslator.translatePreservingPlaceholders(
      tokenizedString,
      tokenMap,
      targetLanguage
    );
    expect(translatedString).toBe("値: {{data}}");
  });
});

describe('stringHelpers tokenization/detokenization', () => {
  it('tokenizeString should correctly identify and map various placeholders', () => {
    const str = "Hello {{ name }}, you have %d messages. Your ID is {userId}.";
    const { tokenizedString, tokenMap } = tokenizeString(str);
    expect(tokenizedString).toBe("Hello TOKEN_0, you have TOKEN_1 messages. Your ID is TOKEN_2.");
    expect(tokenMap).toEqual({
      "TOKEN_0": "{{ name }}",
      "TOKEN_1": "%d",
      "TOKEN_2": "{userId}"
    });
  });

  it('detokenizeString should correctly restore placeholders', () => {
    const tokenizedStr = "Hola TOKEN_0, tienes TOKEN_1 mensajes. Tu ID es TOKEN_2.";
    const tokenMap = {
      "TOKEN_0": "{{ name }}",
      "TOKEN_1": "%d",
      "TOKEN_2": "{userId}"
    };
    const result = detokenizeString(tokenizedStr, tokenMap);
    expect(result).toBe("Hola {{ name }}, tienes %d mensajes. Tu ID es {userId}.");
  });

  it('tokenizeString should handle strings with no placeholders', () => {
    const str = "Just a regular string.";
    const { tokenizedString, tokenMap } = tokenizeString(str);
    expect(tokenizedString).toBe("Just a regular string.");
    expect(tokenMap).toEqual({});
  });

  it('detokenizeString should handle strings with no tokens', () => {
    const str = "Una cadena normal.";
    const tokenMap = { "TOKEN_0": "{var}" }; // Map not relevant if no tokens in string
    const result = detokenizeString(str, tokenMap);
    expect(result).toBe("Una cadena normal.");
  });

  it('tokenizeString should handle adjacent placeholders', () => {
    const str = "{{greeting}}%username%";
    const { tokenizedString, tokenMap } = tokenizeString(str);
    expect(tokenizedString).toBe("TOKEN_0TOKEN_1");
    expect(tokenMap).toEqual({
      "TOKEN_0": "{{greeting}}",
      "TOKEN_1": "%username%"
    });
  });

  it('tokenizeString should handle multiple identical placeholders correctly', () => {
    const str = "User: {name}, Role: {name}";
    const { tokenizedString, tokenMap } = tokenizeString(str);
    // The current implementation of tokenizeString replaces all occurrences of a placeholder type with the same token
    expect(tokenizedString).toBe("User: TOKEN_0, Role: TOKEN_0");
    expect(tokenMap).toEqual({
      "TOKEN_0": "{name}"
    });
  });

  it('detokenizeString should correctly restore multiple identical placeholders', () => {
    const tokenizedStr = "Usuario: TOKEN_0, Rol: TOKEN_0";
    const tokenMap = { "TOKEN_0": "{name}" };
    const result = detokenizeString(tokenizedStr, tokenMap);
    expect(result).toBe("Usuario: {name}, Rol: {name}");
  });
});
