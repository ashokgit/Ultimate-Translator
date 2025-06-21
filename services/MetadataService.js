const logger = require("../utils/logger");

class MetadataService {
  constructor() {
    this.contentTypes = {
      SAMPLE: 'sample',
      PAGE: 'page',
      CONTENT: 'content',
      TRANSLATION: 'translation'
    };
  }

  /**
   * Generate appropriate metadata based on content type and context
   */
  generateMetadata(contentType, options = {}) {
    const baseMetadata = {
      created_at: new Date().toISOString(),
      verified: false,
      auto_generated: true
    };

    switch (contentType) {
      case this.contentTypes.SAMPLE:
        return this.generateSampleMetadata(options, baseMetadata);
      
      case this.contentTypes.TRANSLATION:
        return this.generateTranslationMetadata(options, baseMetadata);
      
      case this.contentTypes.PAGE:
        return this.generatePageMetadata(options, baseMetadata);
      
      default:
        return baseMetadata;
    }
  }

  generateSampleMetadata(options, baseMetadata) {
    const { sourceData, translationStats } = options;
    
    return {
      ...baseMetadata,
      sample_type: this.detectSampleType(sourceData),
      translation_features: this.extractTranslationFeatures(sourceData),
      suggested_languages: this.suggestLanguages(sourceData),
      api_usage_example: this.generateApiExample(options),
      stats: translationStats
    };
  }

  generateTranslationMetadata(options, baseMetadata) {
    const { language, stats, modelName } = options;
    
    return {
      ...baseMetadata,
      target_language: language,
      model_name: modelName,
      translation_stats: stats,
      quality_score: this.calculateQualityScore(stats),
      processing_time: stats.processing_time
    };
  }

  generatePageMetadata(options, baseMetadata) {
    const { sourceUrl, contentId, modelName } = options;
    
    return {
      ...baseMetadata,
      source_url: sourceUrl,
      content_id: contentId,
      model_name: modelName,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Detect the type of sample content for better categorization
   */
  detectSampleType(data) {
    if (!data || typeof data !== 'object') return 'unknown';

    // Check for travel/tourism content
    if (this.hasFields(data, ['destination', 'attractions', 'local_cuisine', 'practical_info'])) {
      return 'यात्रा मार्गदर्शिका'; // Travel Guide
    }

    // Check for e-commerce content
    if (this.hasFields(data, ['product', 'price', 'description', 'category'])) {
      return 'उत्पाद कैटलॉग'; // Product Catalog
    }

    // Check for restaurant/food content
    if (this.hasFields(data, ['menu', 'dishes', 'restaurant', 'cuisine'])) {
      return 'भोजन मेनू'; // Food Menu
    }

    // Check for event content
    if (this.hasFields(data, ['event', 'date', 'venue', 'schedule'])) {
      return 'कार्यक्रम गाइड'; // Event Guide
    }

    // Check for blog/article content
    if (this.hasFields(data, ['title', 'content', 'author', 'tags'])) {
      return 'लेख सामग्री'; // Article Content
    }

    return 'सामान्य सामग्री'; // General Content
  }

  /**
   * Extract translation features from the data structure
   */
  extractTranslationFeatures(data) {
    const features = [];
    
    if (this.hasNestedContent(data)) features.push('Nested content structure');
    if (this.hasArrayContent(data)) features.push('List-based information');
    if (this.hasRichText(data)) features.push('Rich text content');
    if (this.hasMultimedia(data)) features.push('Multimedia references');
    if (this.hasDateTimeInfo(data)) features.push('Date and time information');
    if (this.hasLocationInfo(data)) features.push('Location-based content');
    if (this.hasPricingInfo(data)) features.push('Pricing information');
    
    return features.length > 0 ? features : ['Basic text translation'];
  }

  /**
   * Suggest appropriate target languages based on content type
   */
  suggestLanguages(data) {
    const sampleType = this.detectSampleType(data);
    
    // Common international languages
    const baseLanguages = ['es', 'fr', 'de', 'it', 'pt'];
    
    // Add region-specific languages based on content type
    if (sampleType.includes('यात्रा')) { // Travel content
      return [...baseLanguages, 'ja', 'ko', 'zh', 'ar', 'ru'];
    }
    
    if (sampleType.includes('उत्पाद')) { // Product content
      return [...baseLanguages, 'zh', 'ja', 'ar'];
    }
    
    return baseLanguages;
  }

  /**
   * Generate API usage example
   */
  generateApiExample(options) {
    const { language = 'hi', modelName = 'general', contentId = 'sample_001' } = options;
    
    return {
      endpoint: '/api/v1/translate',
      method: 'POST',
      payload: {
        source_url: 'http://localhost:3000/api/v1/sample/content',
        target_language: language,
        model_name: modelName,
        content_id: contentId
      },
      expected_response: {
        success: true,
        data: '... translated content ...',
        metadata: {
          translation_time: '< 2 seconds',
          cached: false,
          quality_score: 0.95
        }
      }
    };
  }

  /**
   * Calculate quality score based on translation statistics
   */
  calculateQualityScore(stats) {
    if (!stats) return 0;
    
    const { translated, cached, skipped, errors } = stats;
    const total = translated + cached + skipped + errors;
    
    if (total === 0) return 0;
    
    const successRate = (translated + cached) / total;
    const errorRate = errors / total;
    
    // Quality score formula (0-1 scale)
    return Math.max(0, Math.min(1, successRate - (errorRate * 0.5)));
  }

  /**
   * Helper methods for content analysis
   */
  hasFields(obj, fields) {
    if (!obj || typeof obj !== 'object') return false;
    return fields.some(field => this.hasField(obj, field));
  }

  hasField(obj, field) {
    return Object.keys(obj).some(key => 
      key.toLowerCase().includes(field.toLowerCase())
    );
  }

  hasNestedContent(obj, depth = 0) {
    if (depth > 3 || !obj || typeof obj !== 'object') return false;
    
    return Object.values(obj).some(value => 
      typeof value === 'object' && value !== null && 
      this.hasNestedContent(value, depth + 1)
    );
  }

  hasArrayContent(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(value => Array.isArray(value));
  }

  hasRichText(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(value => 
      typeof value === 'string' && value.length > 100
    );
  }

  hasMultimedia(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const multimediaKeys = ['image', 'video', 'audio', 'media', 'photo'];
    return Object.keys(obj).some(key => 
      multimediaKeys.some(mediaKey => 
        key.toLowerCase().includes(mediaKey)
      )
    );
  }

  hasDateTimeInfo(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const dateKeys = ['date', 'time', 'schedule', 'duration', 'when'];
    return Object.keys(obj).some(key => 
      dateKeys.some(dateKey => 
        key.toLowerCase().includes(dateKey)
      )
    );
  }

  hasLocationInfo(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const locationKeys = ['location', 'address', 'place', 'destination', 'venue'];
    return Object.keys(obj).some(key => 
      locationKeys.some(locKey => 
        key.toLowerCase().includes(locKey)
      )
    );
  }

  hasPricingInfo(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const priceKeys = ['price', 'cost', 'fee', 'rate', 'currency'];
    return Object.keys(obj).some(key => 
      priceKeys.some(priceKey => 
        key.toLowerCase().includes(priceKey)
      )
    );
  }

  /**
   * Clean up translation output by removing unnecessary metadata
   */
  cleanTranslationOutput(translatedData) {
    const unwantedKeys = [
      'verified', 'verified_by', 'source_changed', 'auto_verify'
    ];

    const clean = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(clean);
      }
      
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!unwantedKeys.includes(key)) {
          cleaned[key] = clean(value);
        }
      }
      
      return cleaned;
    };

    return clean(translatedData);
  }
}

module.exports = MetadataService; 