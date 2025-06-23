const logger = require("../utils/logger");
const fs = require('fs').promises;
const path = require('path');

/**
 * TranslationConfigService - Dynamic configuration management for translation rules
 * Enables SaaS customers to customize what gets translated vs preserved
 */
class TranslationConfigService {
  constructor() {
    this.configCache = new Map();
    this.autoDetectedPatterns = new Set();
    this.configPath = path.join(__dirname, '../config/translation-rules.json');
    this.defaultConfig = this.getDefaultConfig();
    this.patternFrequency = new Map(); // Track frequency of detected patterns
    this.initialized = false;
  }

  /**
   * Initialize the service and load configurations
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadConfiguration();
      this.initialized = true;
      logger.info("TranslationConfigService initialized successfully");
    } catch (error) {
      logger.warn("Failed to load translation config, using defaults", { error: error.message });
      this.configCache.set('default', this.defaultConfig);
      this.initialized = true;
    }
  }

  /**
   * Get default configuration with common non-translatable patterns
   */
  getDefaultConfig() {
    return {
      // Basic technical fields
      nonTranslatableKeys: [
        'id', 'uuid', 'key', 'hash', 'token', 'api_key', 'secret',
        'url', 'uri', 'link', 'href', 'src', 'slug', 'permalink',
        'created_at', 'updated_at', 'timestamp', 'date_created', 'date_modified',
        'version', 'build', 'revision', 'commit', 'checksum',
        'lat', 'lng', 'latitude', 'longitude', 'coordinates', 'location_id',
        'timezone', 'tz', 'utc_offset', 'locale_code', 'language_code',
        'currency_code', 'country_code', 'region_code', 'area_code',
        'phone', 'email', 'username', 'user_id', 'account_id', 'session_id'
      ],

      // Pattern-based exclusions
      keyPatterns: [
        /^_.*$/,           // Private fields starting with underscore
        /.*_id$/,          // ID fields ending with _id
        /.*_key$/,         // Key fields ending with _key
        /.*_code$/,        // Code fields ending with _code
        /.*_token$/,       // Token fields ending with _token
        /.*_hash$/,        // Hash fields ending with _hash
        /.*_url$/,         // URL fields ending with _url
        /.*_at$/,          // Timestamp fields ending with _at
        /^[A-Z_]+$/,       // All caps constants
        /^\d+$/,           // Numeric only fields
        /^[a-f0-9-]{36}$/, // UUID patterns
        /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|pdf|doc|docx|zip)$/i // File extensions
      ],

      // Value-based exclusions
      valuePatterns: [
        /^https?:\/\//,                    // URLs
        /^[\w.-]+@[\w.-]+\.\w+$/,         // Email addresses
        /^\+?[\d\s\-\(\)]{7,}$/,          // Phone numbers
        /^[A-Z]{2,3}[-_][A-Z0-9]{2,}$/,   // Country/language codes
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO timestamps
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, // UUIDs
        /^#[0-9a-fA-F]{3,6}$/,            // Hex colors
        /^rgb\(\d+,\s*\d+,\s*\d+\)$/,     // RGB colors
        /^\d+px$/,                        // CSS pixels
        /^\d+(\.\d+)?(em|rem|vh|vw|%)$/   // CSS units
      ],

      // Content type specific rules
      contentTypeRules: {
        'ecommerce': {
          preserveKeys: ['sku', 'barcode', 'gtin', 'upc', 'model_number', 'part_number'],
          preservePatterns: [/^[A-Z0-9]{4,}$/] // Product codes
        },
        'cms': {
          preserveKeys: ['post_id', 'category_id', 'tag_id', 'author_id', 'template'],
          preservePatterns: [/^[a-z0-9-]+$/] // Slugs
        },
        'api': {
          preserveKeys: ['endpoint', 'method', 'status_code', 'response_time'],
          preservePatterns: [/^[A-Z_]+$/] // Constants
        }
      },

      // Auto-detection settings
      autoDetection: {
        enabled: true,
        minFrequency: 5,        // Minimum occurrences before considering a pattern
        learningRate: 0.1,      // How quickly to adapt to new patterns
        maxPatterns: 1000,      // Maximum number of auto-detected patterns to store
        confidenceThreshold: 0.8 // Confidence level for auto-detection
      },

      // Customer-specific overrides
      customerOverrides: {},

      // Analytics tracking
      analytics: {
        trackPatterns: true,
        trackFrequency: true,
        reportingEnabled: true
      }
    };
  }

  /**
   * Load configuration from file
   */
  async loadConfiguration() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Convert string patterns back to RegExp objects
      const processedConfig = this.processLoadedConfig(config);
      this.configCache.set('default', { ...this.defaultConfig, ...processedConfig });
      
      // Load customer-specific configurations
      if (config.customerOverrides) {
        for (const [customerId, customerConfig] of Object.entries(config.customerOverrides)) {
          const processedCustomerConfig = this.processLoadedConfig(customerConfig);
          this.configCache.set(customerId, this.mergeConfigs(this.defaultConfig, processedCustomerConfig));
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, will be created on first save
    }
  }

  /**
   * Process loaded configuration to convert string patterns to RegExp
   */
  processLoadedConfig(config) {
    const processed = { ...config };
    
    // Convert keyPatterns from strings to RegExp objects
    if (processed.keyPatterns && Array.isArray(processed.keyPatterns)) {
      processed.keyPatterns = processed.keyPatterns.map(pattern => {
        if (typeof pattern === 'string') {
          try {
            return new RegExp(pattern);
          } catch (error) {
            logger.warn("Invalid regex pattern", { pattern, error: error.message });
            return null;
          }
        }
        return pattern;
      }).filter(pattern => pattern !== null);
    }
    
    // Convert valuePatterns from strings to RegExp objects
    if (processed.valuePatterns && Array.isArray(processed.valuePatterns)) {
      processed.valuePatterns = processed.valuePatterns.map(pattern => {
        if (typeof pattern === 'string') {
          try {
            return new RegExp(pattern);
          } catch (error) {
            logger.warn("Invalid regex pattern", { pattern, error: error.message });
            return null;
          }
        }
        return pattern;
      }).filter(pattern => pattern !== null);
    }

    // Convert content type rule patterns
    if (processed.contentTypeRules) {
      for (const [contentType, rules] of Object.entries(processed.contentTypeRules)) {
        if (rules.preservePatterns && Array.isArray(rules.preservePatterns)) {
          rules.preservePatterns = rules.preservePatterns.map(pattern => {
            if (typeof pattern === 'string') {
              try {
                return new RegExp(pattern);
              } catch (error) {
                logger.warn("Invalid regex pattern in content type rules", { 
                  contentType, 
                  pattern, 
                  error: error.message 
                });
                return null;
              }
            }
            return pattern;
          }).filter(pattern => pattern !== null);
        }
      }
    }
    
    return processed;
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration() {
    try {
      const defaultConfig = this.configCache.get('default') || this.defaultConfig;
      
      // Collect customer overrides
      const customerOverrides = {};
      for (const [key, config] of this.configCache.entries()) {
        if (key !== 'default') {
          customerOverrides[key] = this.extractOverrides(defaultConfig, config);
        }
      }

      const configToSave = {
        ...this.prepareConfigForSaving(defaultConfig),
        customerOverrides: this.prepareCustomerOverridesForSaving(customerOverrides),
        lastUpdated: new Date().toISOString(),
        autoDetectedPatterns: Array.from(this.autoDetectedPatterns)
      };

      await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2));
      logger.info("Translation configuration saved successfully");
    } catch (error) {
      logger.error("Failed to save translation configuration", { error: error.message });
      throw error;
    }
  }

  /**
   * Prepare configuration for saving by converting RegExp objects to strings
   */
  prepareConfigForSaving(config) {
    const prepared = { ...config };
    
    // Convert RegExp objects to strings for JSON serialization
    if (prepared.keyPatterns && Array.isArray(prepared.keyPatterns)) {
      prepared.keyPatterns = prepared.keyPatterns.map(pattern => 
        pattern instanceof RegExp ? pattern.source : pattern
      );
    }
    
    if (prepared.valuePatterns && Array.isArray(prepared.valuePatterns)) {
      prepared.valuePatterns = prepared.valuePatterns.map(pattern => 
        pattern instanceof RegExp ? pattern.source : pattern
      );
    }

    // Convert content type rule patterns
    if (prepared.contentTypeRules) {
      for (const [contentType, rules] of Object.entries(prepared.contentTypeRules)) {
        if (rules.preservePatterns && Array.isArray(rules.preservePatterns)) {
          rules.preservePatterns = rules.preservePatterns.map(pattern => 
            pattern instanceof RegExp ? pattern.source : pattern
          );
        }
      }
    }
    
    return prepared;
  }

  /**
   * Prepare customer overrides for saving
   */
  prepareCustomerOverridesForSaving(customerOverrides) {
    const prepared = {};
    for (const [customerId, config] of Object.entries(customerOverrides)) {
      prepared[customerId] = this.prepareConfigForSaving(config);
    }
    return prepared;
  }

  /**
   * Get configuration for a specific customer or default
   */
  async getConfig(customerId = 'default') {
    await this.initialize();
    return this.configCache.get(customerId) || this.configCache.get('default');
  }

  /**
   * Check if a key should be translated
   */
  async shouldTranslateKey(key, value, customerId = 'default') {
    try {
      const config = await this.getConfig(customerId);
      
      if (!config) {
        logger.warn("No configuration found, using default behavior", { customerId });
        return true;
      }
      
      // Check explicit key exclusions
      if (config.nonTranslatableKeys && config.nonTranslatableKeys.includes(key.toLowerCase())) {
        this.recordPattern(key, 'key_exclusion', customerId);
        return false;
      }

      // Check key patterns
      if (config.keyPatterns && Array.isArray(config.keyPatterns)) {
        for (const pattern of config.keyPatterns) {
          try {
            if (pattern && typeof pattern.test === 'function' && pattern.test(key)) {
              this.recordPattern(key, 'key_pattern', customerId);
              return false;
            }
          } catch (error) {
            logger.error("Error testing key pattern", { 
              pattern: pattern?.source || pattern, 
              key, 
              customerId, 
              error: error.message 
            });
          }
        }
      }

      // Check value patterns if value is provided
      if (value && typeof value === 'string' && config.valuePatterns && Array.isArray(config.valuePatterns)) {
        for (const pattern of config.valuePatterns) {
          try {
            if (pattern && typeof pattern.test === 'function' && pattern.test(value)) {
              this.recordPattern(key, 'value_pattern', customerId);
              return false;
            }
          } catch (error) {
            logger.error("Error testing value pattern", { 
              pattern: pattern?.source || pattern, 
              value: value.substring(0, 50), 
              key, 
              customerId, 
              error: error.message 
            });
          }
        }
      }

      // Check auto-detected patterns
      if (this.autoDetectedPatterns.has(key.toLowerCase())) {
        this.recordPattern(key, 'auto_detected', customerId);
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Error in shouldTranslateKey", { key, customerId, error: error.message });
      // Fallback to safe behavior - don't translate if there's an error
      return false;
    }
  }

  /**
   * Auto-detect non-translatable patterns from data
   */
  async autoDetectPatterns(data, customerId = 'default') {
    if (!data || typeof data !== 'object') return;

    const config = await this.getConfig(customerId);
    if (!config.autoDetection.enabled) return;

    const patterns = this.extractPatterns(data);
    
    for (const pattern of patterns) {
      const frequency = this.patternFrequency.get(pattern) || 0;
      this.patternFrequency.set(pattern, frequency + 1);

      // If pattern occurs frequently enough, consider it for auto-detection
      if (frequency + 1 >= config.autoDetection.minFrequency) {
        const confidence = this.calculatePatternConfidence(pattern, data);
        
        if (confidence >= config.autoDetection.confidenceThreshold) {
          this.autoDetectedPatterns.add(pattern);
          logger.info("Auto-detected non-translatable pattern", { 
            pattern, 
            frequency: frequency + 1, 
            confidence,
            customerId 
          });
        }
      }
    }
  }

  /**
   * Extract potential patterns from data structure
   */
  extractPatterns(obj, path = '') {
    const patterns = [];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Add key as potential pattern
        patterns.push(key.toLowerCase());
        
        // Check for technical patterns
        if (typeof value === 'string') {
          // Check if it looks like a technical field
          if (this.looksLikeTechnicalField(key, value)) {
            patterns.push(key.toLowerCase());
          }
        }
        
        // Recursively extract from nested objects
        if (typeof value === 'object' && value !== null) {
          patterns.push(...this.extractPatterns(value, currentPath));
        }
      }
    }
    
    return patterns;
  }

  /**
   * Check if a key-value pair looks like a technical field
   */
  looksLikeTechnicalField(key, value) {
    const technicalIndicators = [
      // Key indicators
      key.includes('id') || key.includes('key') || key.includes('code'),
      key.includes('url') || key.includes('uri') || key.includes('link'),
      key.includes('timestamp') || key.includes('date') || key.includes('time'),
      key.includes('config') || key.includes('setting') || key.includes('param'),
      
      // Value indicators
      /^[a-f0-9]{8,}$/i.test(value), // Hex strings
      /^\d{10,}$/.test(value),       // Timestamps
      /^[A-Z_]+$/.test(value),       // Constants
      /^[a-z0-9-]+$/.test(value) && value.length > 10, // Slugs/IDs
      value.includes('://'),          // URLs
      value.includes('@') && value.includes('.') // Emails
    ];

    return technicalIndicators.some(indicator => indicator);
  }

  /**
   * Calculate confidence score for a pattern
   */
  calculatePatternConfidence(pattern, data) {
    // Simple confidence calculation based on pattern characteristics
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for common technical patterns
    const technicalKeywords = ['id', 'key', 'code', 'url', 'timestamp', 'hash'];
    if (technicalKeywords.some(keyword => pattern.includes(keyword))) {
      confidence += 0.3;
    }
    
    // Increase confidence based on frequency
    const frequency = this.patternFrequency.get(pattern) || 0;
    confidence += Math.min(frequency * 0.05, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Record pattern usage for analytics
   */
  recordPattern(key, type, customerId) {
    if (!this.initialized) return;
    
    const config = this.configCache.get(customerId);
    if (config?.analytics?.trackPatterns) {
      logger.debug("Pattern recorded", { key, type, customerId });
    }
  }

  /**
   * Add custom rule for a customer
   */
  async addCustomerRule(customerId, rule) {
    await this.initialize();
    
    let customerConfig = this.configCache.get(customerId);
    if (!customerConfig) {
      customerConfig = { ...this.defaultConfig };
    }

    // Add the rule based on type
    switch (rule.type) {
      case 'key':
        customerConfig.nonTranslatableKeys.push(rule.pattern);
        break;
      case 'keyPattern':
        customerConfig.keyPatterns.push(new RegExp(rule.pattern));
        break;
      case 'valuePattern':
        customerConfig.valuePatterns.push(new RegExp(rule.pattern));
        break;
    }

    this.configCache.set(customerId, customerConfig);
    await this.saveConfiguration();
    
    logger.info("Custom rule added", { customerId, rule });
  }

  /**
   * Get analytics data
   */
  getAnalytics(customerId = 'default') {
    return {
      patternFrequency: Object.fromEntries(this.patternFrequency),
      autoDetectedPatterns: Array.from(this.autoDetectedPatterns),
      configuredRules: this.configCache.get(customerId)?.nonTranslatableKeys?.length || 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Merge configurations
   */
  mergeConfigs(base, override) {
    return {
      ...base,
      ...override,
      nonTranslatableKeys: [...(base.nonTranslatableKeys || []), ...(override.nonTranslatableKeys || [])],
      keyPatterns: [...(base.keyPatterns || []), ...(override.keyPatterns || [])],
      valuePatterns: [...(base.valuePatterns || []), ...(override.valuePatterns || [])]
    };
  }

  /**
   * Extract overrides from merged config
   */
  extractOverrides(base, merged) {
    const overrides = {};
    
    // Extract added keys
    if (merged.nonTranslatableKeys?.length > base.nonTranslatableKeys?.length) {
      overrides.nonTranslatableKeys = merged.nonTranslatableKeys.slice(base.nonTranslatableKeys.length);
    }
    
    return overrides;
  }
}

module.exports = TranslationConfigService; 