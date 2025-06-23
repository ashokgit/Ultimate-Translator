const { TranslatedPage } = require("../models/TranslatedPage");
const JsonFetcherService = require("./JsonFetcherService");
const TranslationGeneratorService = require("./TranslationGeneratorService");
const MetadataService = require("./MetadataService");
const logger = require("../utils/logger");

class PageTranslationService {
  constructor(modelName, language, customerId = 'default') {
    this.modelName = modelName;
    this.language = language;
    this.customerId = customerId;
    this.jsonFetcher = new JsonFetcherService();
    this.translationGenerator = new TranslationGeneratorService(customerId);
    this.metadataService = new MetadataService();
  }

  async translatePage(sourceUrl, contentId) {
    const startTime = Date.now();
    
    try {
      logger.info("Starting page translation", {
        sourceUrl,
        contentId,
        modelName: this.modelName,
        language: this.language
      });

      // Fetch source data
      const jsonData = await this.jsonFetcher.fetchData(sourceUrl);
      
      // Generate translations with improved service
      const translations = await this.translationGenerator.generateTranslations(
        jsonData,
        this.language
      );

      // Get translation statistics
      const translationStats = this.translationGenerator.getTranslationStats();
      translationStats.processing_time = Date.now() - startTime;

      // Check if translation already exists
      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: contentId,
        model_name: this.modelName,
      });

      if (existingTranslatedPage) {
        return await this.updateExistingTranslation(
          existingTranslatedPage, 
          translations, 
          translationStats
        );
      }

      // Create new translated page
      return await this.createNewTranslation(
        sourceUrl, 
        contentId, 
        jsonData, 
        translations, 
        translationStats
      );

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error("Page translation failed", {
        sourceUrl,
        contentId,
        modelName: this.modelName,
        language: this.language,
        processingTime: `${processingTime}ms`,
        error: error.message
      });
      throw new Error(`Failed to translate page: ${error.message}`);
    }
  }

  async updateExistingTranslation(existingPage, translations, stats) {
    const existingTranslations = existingPage.translations;

    // Check if the language already exists
    const languageIndex = existingTranslations.findIndex(translation => 
      Object.keys(translation)[0] === this.language
    );

    if (languageIndex >= 0) {
      // Update existing language translation
      existingTranslations[languageIndex] = {
        [this.language]: translations[this.language]
      };
      
      logger.info("Updated existing translation", {
        contentId: existingPage.content_id,
        modelName: this.modelName,
        language: this.language,
        stats
      });
    } else {
      // Add new language translation
      existingTranslations.push({
        [this.language]: translations[this.language]
      });
      
      logger.info("Added new language translation", {
        contentId: existingPage.content_id,
        modelName: this.modelName,
        language: this.language,
        stats
      });
    }

    // Update metadata
    existingPage.last_requested_at = new Date();
    existingPage.markModified("translations");
    
    await existingPage.save();
    return existingPage;
  }

  async createNewTranslation(sourceUrl, contentId, sourceData, translations, stats) {
    // Generate appropriate metadata
    const metadata = this.metadataService.generateMetadata('page', {
      sourceUrl,
      contentId,
      modelName: this.modelName,
      language: this.language,
      stats
    });

    const translatedPage = new TranslatedPage({
      content_id: contentId,
      source_url: sourceUrl,
      model_name: this.modelName,
      source_data: sourceData,
      translations: [{ [this.language]: translations[this.language] }],
      metadata: metadata
    });

    await translatedPage.save();
    
    logger.info("Created new translation", {
      contentId,
      modelName: this.modelName,
      language: this.language,
      stats
    });

    return translatedPage;
  }

  /**
   * Get translation quality metrics
   */
  getTranslationQuality(translatedData) {
    const stats = this.translationGenerator.getTranslationStats();
    return this.metadataService.calculateQualityScore(stats);
  }

  /**
   * Clean translation output for external APIs
   */
  cleanTranslationForAPI(translatedData) {
    return this.metadataService.cleanTranslationOutput(translatedData);
  }

  /**
   * Generate sample data with proper categorization
   */
  generateSampleData(sourceData, translatedData) {
    const stats = this.translationGenerator.getTranslationStats();
    
    return this.metadataService.generateMetadata('sample', {
      sourceData,
      translationStats: stats,
      language: this.language,
      modelName: this.modelName
    });
  }
}

module.exports = PageTranslationService;
