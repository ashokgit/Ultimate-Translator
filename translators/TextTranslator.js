const config = require("../config");
const logger = require("../utils/logger");
const TranslationLog = require("../models/TranslationLog");
const GoogleTranslator = require("./GoogleTranslator");
const HuggingFaceTranslator = require("./HuggingFaceTranslator");
const OpenAITranslator = require("./OpenAITranslator");
const PlaceholderSafeTranslator = require("./PlaceholderSafeTranslator"); // Import the new translator
const { tokenizeString, shouldTranslateSync } = require("../helpers/stringHelpers"); // Import tokenizer and shouldTranslateSync
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

  async translate(originalString, targetLanguage, skipCache = false) {
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

      // Check for placeholders or HTML tags to determine if PlaceholderSafeTranslator should be used
      // This regex should align with what tokenizeString can handle (placeholders + HTML tags)
      // and ignore escaped placeholders.
      const comprehensiveDetectionRegex = /(?<!\\)({{\s*[\w.-]+\s*}})|(?<!\\){([\w.-]+)}|(?<!\\)(%[\w.-]+)|(<\/?\w+((\s+\w+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[\w-]+))?)*\s*|\s*)\/?>)/g;
      const needsSpecialHandling = comprehensiveDetectionRegex.test(originalString);

      let translatedText;

      if (needsSpecialHandling && this.translator instanceof OpenAITranslator) { // Or any other LLM that can handle instructions
        logger.info("Placeholders or HTML tags detected, using PlaceholderSafeTranslator", {
          provider: this.translatorType,
          textLength: originalString.length,
          targetLanguage,
        });
        const { tokenizedString, tokenMap } = tokenizeString(originalString);
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
            // Fallback to standard translation if PlaceholderSafeTranslator fails
            // The circuit breaker below will handle further fallbacks if this also fails
            translatedText = await this.translator.translate(originalString, targetLanguage);
          }
        } else {
          // No actual tokens were generated, proceed with standard translation
          logger.info("Placeholder pattern matched, but no specific tokens generated, proceeding with standard translation.", { provider: this.translatorType });
          translatedText = await this.translator.translate(originalString, targetLanguage);
        }
      } else {
        // Perform actual translation with circuit breaker protection for non-placeholder or non-LLM cases
        logger.info("No placeholders or not using a compatible LLM, calling provider directly", {
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
