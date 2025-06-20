const { OpenAI } = require("openai");
const config = require("../config");
const logger = require("../utils/logger");
const { TranslationError } = require("../utils/errorHandler");

class OpenAITranslator {
  constructor() {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
    
    logger.info("OpenAI Translator initialized", {
      model: this.model,
      maxTokens: this.maxTokens
    });
  }

  async translate(originalString, targetLanguage) {
    const startTime = Date.now();
    
    try {
      logger.debug("Starting OpenAI translation", {
        textLength: originalString.length,
        targetLanguage: targetLanguage,
        model: this.model
      });

      const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else:\n\n${originalString}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a professional translator. Translate the given text accurately while preserving the original meaning and tone."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      const translatedText = response.choices[0].message.content.trim();
      const translationTime = Date.now() - startTime;
      
      logger.logTranslation('openai', originalString, targetLanguage, true);
      
      logger.debug("OpenAI translation completed", {
        translationTime: `${translationTime}ms`,
        resultLength: translatedText.length,
        tokensUsed: response.usage?.total_tokens || 'unknown'
      });

      return translatedText;
    } catch (error) {
      const translationTime = Date.now() - startTime;
      logger.logTranslation('openai', originalString, targetLanguage, false, error);
      
      logger.error("OpenAI translation failed", {
        error: error.message,
        translationTime: `${translationTime}ms`,
        textLength: originalString.length,
        targetLanguage: targetLanguage,
        model: this.model
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
