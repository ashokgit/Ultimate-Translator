const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");
const { TranslationError } = require("../utils/errorHandler");

class OpenAITranslator {
  constructor() {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API key is required. Please set OPENAI_API_KEY environment variable.");
    }
    
    this.apiKey = config.openai.apiKey;
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

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
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
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: config.translation.requestTimeout
        }
      );

      const translatedText = response.data.choices[0].message.content.trim();
      const translationTime = Date.now() - startTime;
      
      logger.logTranslation('openai', originalString, targetLanguage, true);
      
      logger.debug("OpenAI translation completed", {
        translationTime: `${translationTime}ms`,
        resultLength: translatedText.length,
        tokensUsed: response.data.usage?.total_tokens || 'unknown'
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
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        
        if (status === 401) {
          throw new TranslationError('OpenAI', 'Invalid API key');
        } else if (status === 429) {
          throw new TranslationError('OpenAI', 'Rate limit exceeded');
        } else if (status >= 500) {
          throw new TranslationError('OpenAI', 'Service temporarily unavailable');
        } else {
          throw new TranslationError('OpenAI', `API error: ${message}`);
        }
      } else if (error.request) {
        throw new TranslationError('OpenAI', 'Service unavailable - no response from OpenAI');
      } else {
        throw new TranslationError('OpenAI', error.message);
      }
    }
  }
}

module.exports = OpenAITranslator;
