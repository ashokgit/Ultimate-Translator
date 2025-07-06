const TranslationLog = require("../models/TranslationLog");
const TextTranslator = require("../translators/TextTranslator");
const NumeralTranslator = require("../translators/NumeralTranslator");
const { shouldTranslate, shouldTranslateSync, makeSlug, needsUrl, learnFromData } = require("../helpers/stringHelpers");
const logger = require("../utils/logger");

class TranslationGeneratorService {
  constructor(customerId = 'default') {
    this.customerId = customerId;
    this.numeralTranslator = new NumeralTranslator();
    this.translationStats = {
      translated: 0,
      skipped: 0,
      cached: 0,
      errors: 0
    };
  }

  async generateTranslations(data, language) {
    logger.info("Starting translation generation", {
      language,
      customerId: this.customerId,
      dataType: typeof data,
      isArray: Array.isArray(data)
    });

    // Reset stats for this translation session
    this.translationStats = { translated: 0, skipped: 0, cached: 0, errors: 0 };

    // Auto-learn from data patterns before processing
    await learnFromData(data, this.customerId);

    const translatedData = await this.traverseAndTranslate(data, language, '');
    
    // Add minimal metadata only at root level
    const result = {
      ...translatedData,
      _translation_meta: {
        target_language: language,
        translated_at: new Date().toISOString(),
        customer_id: this.customerId,
        stats: this.translationStats,
        verified: false,
        auto_generated: true
      }
    };

    logger.info("Translation generation completed", {
      language,
      customerId: this.customerId,
      stats: this.translationStats
    });

    const translations = {};
    translations[language] = result;
    return translations;
  }

  async traverseAndTranslate(node, language, path = '', parentKey = '') {
    if (node === null || node === undefined) {
      return node;
    }

    if (Array.isArray(node)) {
      const translatedArray = [];
      for (let index = 0; index < node.length; index++) {
        const currentPath = `${path}[${index}]`;
        try {
          const translatedItem = await this.traverseAndTranslate(
            node[index], 
            language, 
            currentPath, 
            parentKey
          );
          translatedArray.push(translatedItem);
        } catch (error) {
          logger.error("Error translating array item", {
            path: currentPath,
            error: error.message
          });
          this.translationStats.errors++;
          translatedArray.push(node[index]); // Keep original on error
        }
      }
      return translatedArray;
    }

    if (typeof node === 'object' && node !== null) {
      const translatedObject = {};
      const translationPromises = [];

      // First pass: handle non-object values and collect translation promises
      for (const [key, value] of Object.entries(node)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
          // Handle objects recursively (will be processed after translation promises)
          continue;
        } 
        else if (await shouldTranslate(value, key, this.customerId)) {
          // Queue for translation
          translationPromises.push(
            this.translateValue(value, language, key, currentPath)
              .then(translatedValue => ({ key, value: translatedValue }))
              .catch(error => {
                logger.error("Translation failed for value", {
                  path: currentPath,
                  key,
                  customerId: this.customerId,
                  error: error.message
                });
                this.translationStats.errors++;
                return { key, value }; // Keep original on error
              })
          );
        } else {
          // Non-translatable value, keep as is
          translatedObject[key] = value;
          this.translationStats.skipped++;
        }
      }

      // Execute all translations in parallel
      const translationResults = await Promise.all(translationPromises);
      
      // Apply translation results
      translationResults.forEach(({ key, value }) => {
        translatedObject[key] = value;
      });

      // Second pass: handle object values recursively
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'object' && value !== null) {
          const currentPath = path ? `${path}.${key}` : key;
          try {
            translatedObject[key] = await this.traverseAndTranslate(
              value, 
              language, 
              currentPath, 
              key
            );
          } catch (error) {
            logger.error("Error translating nested object", {
              path: currentPath,
              error: error.message
            });
            this.translationStats.errors++;
            translatedObject[key] = value; // Keep original on error
          }
        }
      }

      // Smart URL generation - only for appropriate objects
      if (needsUrl(translatedObject)) {
        const urlSource = translatedObject.name || 
                         translatedObject.title || 
                         translatedObject.description ||
                         translatedObject.overview ||
                         Object.values(translatedObject).find(v => 
                           typeof v === 'string' && v.length > 5 && v.length < 100
                         );
        
        if (urlSource) {
          const slug = makeSlug(urlSource);
          if (slug && slug.length > 0) {
            translatedObject.url = slug;
            translatedObject.old_urls = []; // For URL history tracking
          }
        }
      }

      return translatedObject;
    }

    // Primitive value
    if (await shouldTranslate(node, parentKey, this.customerId)) {
      try {
        return await this.translateValue(node, language, parentKey, path);
      } catch (error) {
        logger.error("Translation failed for primitive value", {
          path,
          customerId: this.customerId,
          error: error.message
        });
        this.translationStats.errors++;
        return node; // Keep original on error
      }
    }

    this.translationStats.skipped++;
    return node;
  }

  async translateValue(text, language, key = '', path = '', skipCache = false) {
    try {
      // Check cache first (unless skipCache is true)
      if (!skipCache) {
        const existingTranslation = await TranslationLog.findOne({
          text: text,
          lang: language,
        });

        if (existingTranslation) {
          this.translationStats.cached++;
          logger.debug("Translation found in cache", {
            key,
            path,
            textLength: text.length,
            language
          });
          
          // Apply numeral conversion to cached translations too
          let cachedText = existingTranslation.translated_text;
          if (this.numeralTranslator.hasNumeralsToConvert(cachedText, language)) {
            try {
              cachedText = await this.numeralTranslator.convertNumerals(cachedText, language);
            } catch (error) {
              logger.warn("Numeral conversion failed for cached text", {
                key,
                path,
                language,
                error: error.message
              });
            }
          }
          
          return cachedText;
        }
      } else {
        logger.info("Skipping cache for re-translation", {
          key,
          path,
          textLength: text.length,
          language,
          originalText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          reason: "Cache bypass requested for fresh translation"
        });
      }

      // Perform translation
      let translatedText = await this.translate(text, language, skipCache);
      
      // Convert numerals to target language script if needed
      if (this.numeralTranslator.hasNumeralsToConvert(translatedText, language)) {
        try {
          translatedText = await this.numeralTranslator.convertNumerals(translatedText, language);
          logger.debug("Numerals converted", {
            key,
            path,
            language,
            hasNumerals: true
          });
        } catch (error) {
          logger.warn("Numeral conversion failed, using text without numeral conversion", {
            key,
            path,
            language,
            error: error.message
          });
          // Continue with translated text without numeral conversion
        }
      }
      
      this.translationStats.translated++;
      logger.debug("New translation completed", {
        key,
        path,
        textLength: text.length,
        resultLength: translatedText.length,
        language,
        skipCache: skipCache,
        originalText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        translatedText: translatedText.substring(0, 50) + (translatedText.length > 50 ? '...' : '')
      });

      return translatedText;

    } catch (error) {
      logger.error("Translation failed", {
        key,
        path,
        text: text.substring(0, 50) + '...',
        language,
        error: error.message
      });
      throw error;
    }
  }

  async translate(text, targetLanguage, skipCache = false) {
    const translator = new TextTranslator();
    return await translator.translate(text, targetLanguage, skipCache);
  }

  getTranslationStats() {
    return { ...this.translationStats };
  }
}

module.exports = TranslationGeneratorService;
