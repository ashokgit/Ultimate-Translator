const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");
const { TranslationError } = require("../utils/errorHandler");

class HuggingFaceTranslator {
  constructor(translatorUrl) {
    this.translatorUrl = translatorUrl || config.huggingface.apiUrl;
    
    logger.info("HuggingFace Translator initialized", {
      apiUrl: this.translatorUrl
    });
  }

  async translate(text, lang) {
    const startTime = Date.now();
    
    try {
      const payload = {
        text: text,
        lang: lang,
      };

      logger.debug("Starting HuggingFace translation", {
        textLength: text.length,
        targetLanguage: lang,
        apiUrl: this.translatorUrl
      });

      const response = await axios.post(
        `${this.translatorUrl}/api/v1/translate`,
        payload,
        {
          timeout: config.translation.requestTimeout,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.status === 200) {
        const translationTime = Date.now() - startTime;
        logger.logTranslation('huggingface', text, lang, true);
        
        logger.debug("HuggingFace translation completed", {
          translationTime: `${translationTime}ms`,
          resultLength: response.data.translated_text.length
        });
        
        return response.data.translated_text;
      } else {
        throw new Error(`Translation request failed with status: ${response.status}`);
      }
    } catch (error) {
      const translationTime = Date.now() - startTime;
      logger.logTranslation('huggingface', text, lang, false, error);
      
      logger.error("HuggingFace translation failed", {
        error: error.message,
        translationTime: `${translationTime}ms`,
        textLength: text.length,
        targetLanguage: lang,
        apiUrl: this.translatorUrl
      });
      
      if (error.response) {
        // API responded with error status
        throw new TranslationError('HuggingFace', `API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new TranslationError('HuggingFace', 'Service unavailable - no response from translation service');
      } else {
        // Something else happened
        throw new TranslationError('HuggingFace', error.message);
      }
    }
  }
}

module.exports = HuggingFaceTranslator;
