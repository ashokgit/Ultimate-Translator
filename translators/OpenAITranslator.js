const { OpenAI } = require("openai");
const config = require("../config");
const logger = require("../utils/logger");
const { TranslationError } = require("../utils/errorHandler");
const ApiKeyIntegrationService = require("../services/ApiKeyIntegrationService");
const supportedLanguages = require("../config/languages");

class OpenAITranslator {
  constructor() {
    this.initialized = false;
    this.openai = null;
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
    this.apiKeyForLogging = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Get API key from integration service
      const apiKeyData = await ApiKeyIntegrationService.getApiKeyForProvider('openai', true);
      
      const apiKey = apiKeyData.apiKey;

      if (!apiKey) {
        throw new Error("OpenAI API key is required or could not be decrypted");
      }

      this.apiKeyForLogging = apiKey;

      // Add a log to show which key is being used (without exposing the full key)
      const keyIdentifier = `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`;


      // Initialize OpenAI client
      this.openai = new OpenAI({
        apiKey,
      });

      // Update configuration if available
      if (apiKeyData.config) {
        this.model = apiKeyData.config.model || this.model;
        this.maxTokens = apiKeyData.config.maxTokens || this.maxTokens;
        
        // Log the model being used
        logger.info("OpenAI model configuration", {
          model: this.model,
          maxTokens: this.maxTokens,
          source: apiKeyData.source || 'database'
        });
      }
      
      this.initialized = true;
      
      logger.info("OpenAI Translator initialized", {
        model: this.model,
        maxTokens: this.maxTokens,
        source: apiKeyData.source || 'database'
      });
    } catch (error) {
      logger.error("Failed to initialize OpenAI Translator", { error: error.message });
      throw error;
    }
  }

  async translate(originalString, targetLanguage) {
    const startTime = Date.now();
    
    logger.info("OpenAI Translator called", {
      originalText: originalString,
      targetLanguage: targetLanguage,
      textLength: originalString.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Ensure translator is initialized
      await this.initialize();

      const languageName =
        supportedLanguages.find((lang) => lang.code === targetLanguage)?.name ||
        targetLanguage;

      logger.debug("Starting OpenAI translation", {
        textLength: originalString.length,
        targetLanguage: languageName,
        targetLanguageCode: targetLanguage,
        model: this.model,
        originalText: originalString.substring(0, 100) + (originalString.length > 100 ? '...' : '')
      });

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are an expert translator. Your task is to translate the user's text into ${languageName} language (language code: ${targetLanguage}). 

CRITICAL INSTRUCTIONS:
- Translate the text into ${languageName} language, NOT into any other language
- Use ${languageName} script and vocabulary
- For place names like "Kyoto, Japan", transliterate them into ${languageName} script (e.g., "क्योटो, जापान" for Nepali)
- Do NOT convert text to Japanese, Chinese, or any other language's characters unless specifically requested
- Preserve original meaning, tone, and formatting (including HTML tags, markdown, and line breaks)
- If you encounter placeholders (like %s, {variable}, etc.), keep them as they are
- Translate accurately and naturally to ${languageName}

Target Language: ${languageName} (${targetLanguage})`,
          },
          {
            role: "user",
            content: originalString,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3,
      });

      const translatedText = response.choices[0].message.content.trim();
      const translationTime = Date.now() - startTime;
      
      logger.info("OpenAI response received", {
        originalText: originalString,
        translatedText: translatedText,
        targetLanguage: targetLanguage,
        languageName: languageName,
        model: this.model,
        translationTime: `${translationTime}ms`,
        fullResponse: JSON.stringify(response.choices[0].message)
      });
      
      logger.logTranslation('openai', originalString, targetLanguage, true);
      
      logger.debug("OpenAI translation completed", {
        translationTime: `${translationTime}ms`,
        resultLength: translatedText.length,
        tokensUsed: response.usage?.total_tokens || 'unknown',
        originalText: originalString.substring(0, 50) + (originalString.length > 50 ? '...' : ''),
        translatedText: translatedText.substring(0, 50) + (translatedText.length > 50 ? '...' : ''),
        targetLanguage: languageName,
        targetLanguageCode: targetLanguage
      });

      return translatedText;
    } catch (error) {
      const translationTime = Date.now() - startTime;
      logger.logTranslation('openai', originalString, targetLanguage, false, error);
      
      logger.error("OpenAI translation failed", {
        error: error.message,
        translationTime: `${translationTime}ms`,
        textLength: originalString.length,
        targetLanguage: languageName,
        model: this.model,
        keyUsed: this.apiKeyForLogging ? `${this.apiKeyForLogging.substring(0, 5)}...${this.apiKeyForLogging.substring(this.apiKeyForLogging.length - 4)}` : 'N/A'
      });
      
      let finalError;
      if (error instanceof OpenAI.APIError || error.name === 'APIError') {
        const status = error.status;
        const message = error.message;
        
        if (status === 401) {
          finalError = new TranslationError('OpenAI', 'Invalid API key');
        } else if (status === 429) {
          finalError = new TranslationError('OpenAI', 'Rate limit exceeded');
        } else if (status >= 500) {
          finalError = new TranslationError('OpenAI', 'Service temporarily unavailable');
        } else {
          finalError = new TranslationError('OpenAI', `API error: ${message}`);
        }
      } else {
        finalError = new TranslationError('OpenAI', `OpenAI translation service error: ${error.message}`);
      }
      throw finalError;
    }
  }
}

module.exports = OpenAITranslator;
