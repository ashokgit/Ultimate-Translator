const PageTranslationService = require("../services/PageTranslationService");
const MetadataService = require("../services/MetadataService");
const logger = require("../utils/logger");
const { successResponse, ValidationError } = require("../utils/errorHandler");

/**
 * @swagger
 * tags:
 *   name: Sample Data
 *   description: Endpoints for generating and retrieving sample data.
 */
const sampleController = {
  /**
   * @swagger
   * /api/v1/sample/generate:
   *   get:
   *     summary: Generate sample translated data
   *     tags: [Sample Data]
   *     parameters:
   *       - in: query
   *         name: model_name
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: language
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: source_url
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Sample data generated successfully.
   */
  generateSample: async (req, res) => {
    const { model_name, language, source_url, content_id, customer_id } = req.query;

    try {
      // Validate required parameters
      if (!model_name || !language || !source_url) {
        throw new ValidationError("Missing required parameters: model_name, language, source_url");
      }

      const translationService = new PageTranslationService(model_name, language, customer_id || 'default');
      const metadataService = new MetadataService();

      // Perform translation
      const savedPage = await translationService.translatePage(source_url, content_id || `sample_${Date.now()}`);
      
      // Get the translated data
      const translatedData = savedPage.translations.find(t => 
        Object.keys(t)[0] === language
      )[language];

      // Generate sample-specific metadata
      const sampleMetadata = translationService.generateSampleData(
        savedPage.source_data,
        translatedData
      );

      // Create comprehensive sample response
      const sampleResponse = {
        sample_type: sampleMetadata.sample_type,
        description: this.generateSampleDescription(sampleMetadata),
        data: metadataService.cleanTranslationOutput(translatedData),
        translation_features: sampleMetadata.translation_features,
        suggested_languages: sampleMetadata.suggested_languages,
        api_usage_example: this.generateCleanApiExample(sampleMetadata.api_usage_example, {
          language,
          modelName: model_name,
          contentId: content_id
        }),
        quality_metrics: {
          translation_stats: sampleMetadata.stats,
          quality_score: metadataService.calculateQualityScore(sampleMetadata.stats),
          processing_time: `${sampleMetadata.stats.processing_time}ms`
        }
      };

      logger.info("Sample generation completed", {
        modelName: model_name,
        language,
        sampleType: sampleMetadata.sample_type,
        stats: sampleMetadata.stats
      });

      const response = successResponse(
        sampleResponse,
        "Sample translation generated successfully",
        {
          contentId: content_id,
          modelName: model_name,
          targetLanguage: language,
          sampleType: sampleMetadata.sample_type
        }
      );

      return res.status(200).json(response);

    } catch (error) {
      logger.error("Sample generation failed", {
        modelName: model_name,
        language,
        sourceUrl: source_url,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * @swagger
   * /api/v1/sample/types:
   *   get:
   *     summary: Get available sample types
   *     tags: [Sample Data]
   *     responses:
   *       '200':
   *         description: A list of available sample types.
   */
  getSampleTypes: async (req, res) => {
    const sampleTypes = [
      {
        type: 'यात्रा मार्गदर्शिका',
        english: 'Travel Guide',
        description: 'Tourism and travel information with destinations, attractions, and practical tips',
        ideal_for: ['Tourism websites', 'Travel apps', 'Hotel booking platforms']
      },
      {
        type: 'उत्पाद कैटलॉग',
        english: 'Product Catalog',
        description: 'E-commerce product information with descriptions, pricing, and specifications',
        ideal_for: ['Online stores', 'Marketplace platforms', 'Product comparison sites']
      },
      {
        type: 'भोजन मेनू',
        english: 'Food Menu',
        description: 'Restaurant menus and food-related content with dishes and descriptions',
        ideal_for: ['Restaurant websites', 'Food delivery apps', 'Culinary platforms']
      },
      {
        type: 'कार्यक्रम गाइड',
        english: 'Event Guide',
        description: 'Event information with schedules, venues, and activity details',
        ideal_for: ['Event management', 'Conference platforms', 'Entertainment sites']
      },
      {
        type: 'लेख सामग्री',
        english: 'Article Content',
        description: 'Blog posts, news articles, and editorial content',
        ideal_for: ['News websites', 'Blogs', 'Content management systems']
      }
    ];

    const response = successResponse(
      sampleTypes,
      "Available sample types retrieved successfully",
      { count: sampleTypes.length }
    );

    res.status(200).json(response);
  },

  /**
   * @swagger
   * /api/v1/sample/quality:
   *   get:
   *     summary: Get translation quality metrics for a specific translation
   *     tags: [Sample Data]
   *     parameters:
   *       - in: query
   *         name: content_id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: model_name
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: language
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Quality metrics retrieved successfully.
   */
  getQualityMetrics: async (req, res) => {
    const { content_id, model_name, language } = req.query;

    if (!content_id || !model_name || !language) {
      throw new ValidationError("Missing required parameters: content_id, model_name, language");
    }

    const translationService = new PageTranslationService(model_name, language);
    const quality = translationService.getTranslationQuality();

    const response = successResponse(
      { quality_score: quality },
      "Quality metrics retrieved successfully",
      { contentId: content_id, modelName: model_name, language }
    );

    res.status(200).json(response);
  },

  /**
   * Helper method to generate sample description
   */
  generateSampleDescription(metadata) {
    const typeDescriptions = {
      'यात्रा मार्गदर्शिका': 'Comprehensive travel information with attractions, cuisine, and practical tips - ideal for tourism websites',
      'उत्पाद कैटलॉग': 'E-commerce product data with descriptions, pricing, and specifications - perfect for online stores',
      'भोजन मेनू': 'Restaurant menu content with dishes, descriptions, and pricing - great for food service platforms',
      'कार्यक्रम गाइड': 'Event information with schedules, venues, and details - suitable for event management systems',
      'लेख सामग्री': 'Article and blog content with structured text - ideal for content management platforms'
    };

    return typeDescriptions[metadata.sample_type] || 'General content suitable for various applications';
  },

  /**
   * Helper method to generate clean API example
   */
  generateCleanApiExample(example, options) {
    const { language, modelName, contentId } = options;
    
    return {
      endpoint: "/api/v1/translate",
      method: "POST",
      payload: {
        source_url: "https://your-api.com/source-data",
        target_language: language,
        model_name: modelName,
        content_id: contentId || "your_content_id"
      },
      expected_response: {
        success: true,
        message: "Page translation completed successfully",
        data: "... your translated content ...",
        metadata: {
          contentId: contentId,
          modelName: modelName,
          targetLanguage: language,
          processingTime: "< 2 seconds"
        }
      }
    };
  }
};

module.exports = sampleController; 