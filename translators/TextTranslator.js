const config = require("../config");
const logger = require("../utils/logger");
const TranslationLog = require("../models/TranslationLog");
const GoogleTranslator = require("./GoogleTranslator");
const HuggingFaceTranslator = require("./HuggingFaceTranslator");
const OpenAITranslator = require("./OpenAITranslator");
const circuitBreakerManager = require("../utils/circuitBreaker");
const performanceMonitor = require("../utils/performanceMonitor");

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
        
        // Record cache hit
        performanceMonitor.recordTranslation(this.translatorType, cacheTime, true);
        
        return translationLog.translated_text;
      }

      // Perform actual translation with circuit breaker protection
      logger.debug("Translation not in cache, calling provider", {
        provider: this.translatorType,
        textLength: originalString.length,
        targetLanguage
      });
      
      // Define fallback function for circuit breaker
      const fallbackTranslation = async () => {
        logger.warn("Using fallback translation service", {
          originalProvider: this.translatorType,
          targetLanguage
        });
        
        // Try alternative providers in order of preference
        const fallbackProviders = ['google', 'openai', 'huggingface'].filter(p => p !== this.translatorType);
        
        for (const provider of fallbackProviders) {
          try {
            let fallbackTranslator;
            switch (provider) {
              case "google":
                fallbackTranslator = new GoogleTranslator();
                break;
              case "openai":
                fallbackTranslator = new OpenAITranslator();
                break;
              case "huggingface":
                fallbackTranslator = new HuggingFaceTranslator();
                break;
            }
            
            const result = await fallbackTranslator.translate(originalString, targetLanguage);
            logger.info("Fallback translation successful", {
              fallbackProvider: provider,
              originalProvider: this.translatorType
            });
            return result;
          } catch (fallbackError) {
            logger.warn("Fallback translation failed", {
              fallbackProvider: provider,
              error: fallbackError.message
            });
            continue;
          }
        }
        
        // If all fallbacks fail, return original text
        logger.error("All translation providers failed, returning original text", {
          originalProvider: this.translatorType,
          fallbackProviders
        });
        return originalString;
      };
      
      const translatedText = await circuitBreakerManager.execute(
        `translation-${this.translatorType}`,
        async () => await this.translator.translate(originalString, targetLanguage),
        fallbackTranslation,
        {
          timeout: config.translation.requestTimeout || 30000,
          errorThresholdPercentage: 30, // Lower threshold for translation services
          resetTimeout: 60000 // Longer reset time for translation services
        }
      );
      
      // Save to cache
      const newTranslationLog = new TranslationLog({
        text: originalString,
        lang: targetLanguage,
        translated_text: translatedText,
      });
      
      await newTranslationLog.save();
      
      const totalTime = Date.now() - startTime;
      
      // Record translation metrics
      performanceMonitor.recordTranslation(this.translatorType, totalTime, false);
      
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
