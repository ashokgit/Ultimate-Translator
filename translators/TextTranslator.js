const config = require("../config");
const logger = require("../utils/logger");
const TranslationLog = require("../models/TranslationLog");
const GoogleTranslator = require("./GoogleTranslator");
const HuggingFaceTranslator = require("./HuggingFaceTranslator");
const OpenAITranslator = require("./OpenAITranslator");

class TextTranslator {
  constructor() {
    const defaultTranslator = config.translation.defaultProvider;

    try {
      switch (defaultTranslator) {
        case "google":
          this.translator = new GoogleTranslator();
          break;
        case "openai":
          this.translator = new OpenAITranslator();
          break;
        case "huggingface":
          this.translator = new HuggingFaceTranslator();
          break;
        default:
          throw new Error(`Invalid default translator specified: ${defaultTranslator}. Valid options: google, openai, huggingface`);
      }
      
      this.translatorType = defaultTranslator;
      
      logger.info("TextTranslator initialized", {
        provider: defaultTranslator,
        cacheTimeout: config.translation.cacheTimeout
      });
      
    } catch (error) {
      logger.error("Failed to initialize TextTranslator", {
        provider: defaultTranslator,
        error: error.message
      });
      throw error;
    }
  }

  async translate(originalString, targetLanguage) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const translationLog = await TranslationLog.findOne({
        text: originalString,
        lang: targetLanguage,
      });

      if (translationLog) {
        const cacheTime = Date.now() - startTime;
        logger.debug("Translation found in cache", {
          provider: this.translatorType,
          textLength: originalString.length,
          targetLanguage,
          cacheTime: `${cacheTime}ms`
        });
        
        return translationLog.translated_text;
      }

      // Perform actual translation
      logger.debug("Translation not in cache, calling provider", {
        provider: this.translatorType,
        textLength: originalString.length,
        targetLanguage
      });
      
      const translatedText = await this.translator.translate(originalString, targetLanguage);
      
      // Save to cache
      const newTranslationLog = new TranslationLog({
        text: originalString,
        lang: targetLanguage,
        translated_text: translatedText,
      });
      
      await newTranslationLog.save();
      
      const totalTime = Date.now() - startTime;
      logger.info("Translation completed and cached", {
        provider: this.translatorType,
        textLength: originalString.length,
        targetLanguage,
        totalTime: `${totalTime}ms`
      });
      
      return translatedText;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error("Translation failed", {
        provider: this.translatorType,
        textLength: originalString.length,
        targetLanguage,
        totalTime: `${totalTime}ms`,
        error: error.message
      });
      
      throw error;
    }
  }
}

module.exports = TextTranslator;
