const config = require("../config");
const logger = require("../utils/logger");
const TranslationLog = require("../models/TranslationLog");
const GoogleTranslator = require("./GoogleTranslator");
const HuggingFaceTranslator = require("./HuggingFaceTranslator");
const OpenAITranslator = require("./OpenAITranslator");
const PlaceholderSafeTranslator = require("./PlaceholderSafeTranslator");
const stringHelpers = require("../helpers/stringHelpers"); // Import all stringHelpers
const TranslationConfigService = require('../services/TranslationConfigService'); // Import TranslationConfigService
const circuitBreakerManager = require("../utils/circuitBreaker");
const performanceMonitor = require("../utils/performanceMonitor");

class TextTranslator {
  constructor() {
    // Initialize TranslationConfigService instance
    this.translationConfigService = new TranslationConfigService();
    // It's crucial that translationConfigService is initialized, e.g., by calling its own initialize method.
    // For simplicity here, we assume it can be used directly or its methods handle self-initialization.
    // A better pattern might be to ensure it's initialized at app startup and passed in or retrieved as a singleton.
    // For now, let's ensure it gets initialized if not already.
    if (!this.translationConfigService.initialized) {
        this.translationConfigService.initialize().catch(err => {
            logger.error("Failed to initialize TranslationConfigService in TextTranslator constructor", { error: err.message });
            // Depending on requirements, might want to throw or handle this more gracefully
        });
    }

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

  /**
   * Translates a string.
   * @param {string} originalString - The string to translate.
   * @param {string} targetLanguage - The language to translate to.
   * @param {boolean} [skipCache=false] - Whether to skip cache lookup.
   * @param {string} [originalStringKey=''] - The key associated with the original string (for config lookup).
   * @param {string} [customerId='default'] - The customer ID (for config lookup).
   * @returns {Promise<string>} - The translated string.
   */
  async translate(originalString, targetLanguage, skipCache = false, originalStringKey = '', customerId = 'default') {
    const startTime = Date.now();

    try {
      // Check cache first
      if (!skipCache) {
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
            cacheTime: `${cacheTime}ms`,
          });
          performanceMonitor.recordTranslation(this.translatorType, cacheTime, true);
          return translationLog.translated_text;
        }
      }

      // Determine if special handling (placeholder/HTML preservation) should be used
      const configSaysPreserve = await this.translationConfigService.shouldPreserveFormatting(originalStringKey, originalString, customerId);
      const contentNeedsSpecialHandling = stringHelpers.textNeedsSpecialHandling(originalString);

      let translatedText;

      if (configSaysPreserve && contentNeedsSpecialHandling && this.translator instanceof OpenAITranslator) { // Or any other LLM that can handle instructions
        logger.info("Preservation active and content eligible, using PlaceholderSafeTranslator", {
          provider: this.translatorType,
          originalStringKey,
          customerId,
          textLength: originalString.length,
          targetLanguage,
        });
        const { tokenizedString, tokenMap } = stringHelpers.tokenizeString(originalString);
        if (Object.keys(tokenMap).length > 0) {
          const safeTranslator = new PlaceholderSafeTranslator(this.translator);
          try {
            translatedText = await safeTranslator.translatePreservingPlaceholders(
              tokenizedString,
              tokenMap,
              targetLanguage
            );
            logger.info("PlaceholderSafeTranslator completed successfully", { provider: this.translatorType });
          } catch (safeTranslateError) {
            logger.warn("PlaceholderSafeTranslator failed, attempting standard translation", {
              provider: this.translatorType,
              error: safeTranslateError.message,
            });
            translatedText = await this.translator.translate(originalString, targetLanguage);
          }
        } else {
          logger.info("Content initially marked for special handling, but no tokens generated by tokenizeString. Proceeding with standard translation.", { provider: this.translatorType, originalStringKey, customerId });
          translatedText = await this.translator.translate(originalString, targetLanguage);
        }
      } else {
        logger.info("Using standard translation path", {
          provider: this.translatorType,
          configSaysPreserve,
          contentNeedsSpecialHandling,
          isCompatibleLLM: this.translator instanceof OpenAITranslator,
          originalStringKey,
          customerId,
          provider: this.translatorType,
          textLength: originalString.length,
          targetLanguage,
          originalText: originalString.substring(0, 50) + (originalString.length > 50 ? "..." : ""),
          translatorClass: this.translator.constructor.name,
        });

        const fallbackTranslation = async () => {
          logger.warn("Using fallback translation service", {
            originalProvider: this.translatorType,
            targetLanguage,
          });
          const fallbackProviders = ["google", "openai", "huggingface"].filter(p => p !== this.translatorType);
          for (const provider of fallbackProviders) {
            try {
              let fallbackTranslatorInstance;
              switch (provider) {
                case "google": fallbackTranslatorInstance = new GoogleTranslator(); break;
                case "openai": fallbackTranslatorInstance = new OpenAITranslator(); break;
                case "huggingface": fallbackTranslatorInstance = new HuggingFaceTranslator(); break;
              }
              const result = await fallbackTranslatorInstance.translate(originalString, targetLanguage);
              logger.info("Fallback translation successful", { fallbackProvider: provider, originalProvider: this.translatorType });
              return result;
            } catch (fallbackError) {
              logger.warn("Fallback translation failed", { fallbackProvider: provider, error: fallbackError.message });
              continue;
            }
          }
          logger.error("All translation providers failed, returning original text", { originalProvider: this.translatorType, fallbackProviders });
          return originalString;
        };

        translatedText = await circuitBreakerManager.execute(
          `translation-${this.translatorType}`,
          async () => await this.translator.translate(originalString, targetLanguage),
          fallbackTranslation,
          {
            timeout: config.translation.requestTimeout || 30000,
            errorThresholdPercentage: 30,
            resetTimeout: 60000,
          }
        );
      }

      logger.info("Translation completed by provider/strategy", {
        provider: this.translatorType,
        originalText: originalString,
        translatedText: translatedText,
        targetLanguage
      });
      
      // Save to cache, upserting to handle both new and existing entries
      await TranslationLog.findOneAndUpdate(
        { text: originalString, lang: targetLanguage },
        { translated_text: translatedText, updated_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
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
