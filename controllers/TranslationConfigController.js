const { initializeConfig, getConfig, addCustomRule, getConfigAnalytics, configService } = require("../helpers/stringHelpers");
const logger = require("../utils/logger");
const { successResponse, ValidationError, NotFoundError } = require("../utils/errorHandler");

const translationConfigController = {
  /**
   * Get current translation configuration for a customer
   */
  getConfiguration: async (req, res) => {
    const { customer_id = 'default' } = req.query;

    try {
      const config = await getConfig(customer_id);
      
      // Remove sensitive information
      const publicConfig = {
        nonTranslatableKeys: config.nonTranslatableKeys,
        keyPatterns: config.keyPatterns.map(pattern => pattern.toString()),
        valuePatterns: config.valuePatterns.map(pattern => pattern.toString()),
        contentTypeRules: config.contentTypeRules,
        autoDetection: config.autoDetection,
        analytics: config.analytics
      };

      const response = successResponse(
        publicConfig,
        "Configuration retrieved successfully",
        { customerId: customer_id }
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get configuration", {
        customerId: customer_id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Add a custom translation rule for a customer
   */
  addRule: async (req, res) => {
    const { customer_id, rule_type, pattern, description } = req.body;

    // Validate required fields
    if (!customer_id || !rule_type || !pattern) {
      throw new ValidationError("Missing required fields: customer_id, rule_type, pattern");
    }

    // Validate rule type
    const validRuleTypes = ['key', 'keyPattern', 'valuePattern'];
    if (!validRuleTypes.includes(rule_type)) {
      throw new ValidationError(`Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}`);
    }

    try {
      const rule = {
        type: rule_type,
        pattern: pattern,
        description: description || `Custom ${rule_type} rule`,
        created_at: new Date().toISOString()
      };

      await addCustomRule(customer_id, rule);

      logger.info("Custom translation rule added", {
        customerId: customer_id,
        ruleType: rule_type,
        pattern: pattern
      });

      const response = successResponse(
        { rule },
        "Custom rule added successfully",
        { customerId: customer_id }
      );

      res.status(201).json(response);
    } catch (error) {
      logger.error("Failed to add custom rule", {
        customerId: customer_id,
        ruleType: rule_type,
        pattern: pattern,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Get analytics for translation patterns
   */
  getAnalytics: async (req, res) => {
    const { customer_id = 'default' } = req.query;

    try {
      const analytics = getConfigAnalytics(customer_id);

      const response = successResponse(
        analytics,
        "Analytics retrieved successfully",
        { customerId: customer_id }
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get analytics", {
        customerId: customer_id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Test translation rules against sample data
   */
  testRules: async (req, res) => {
    const { customer_id = 'default', test_data } = req.body;

    if (!test_data) {
      throw new ValidationError("Missing required field: test_data");
    }

    try {
      const { shouldTranslate } = require("../helpers/stringHelpers");
      const results = [];

      // Test each key-value pair in the test data
      const testObject = async (obj, path = '') => {
        if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof value === 'string') {
              const shouldTranslateResult = await shouldTranslate(value, key, customer_id);
              results.push({
                path: currentPath,
                key: key,
                value: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
                should_translate: shouldTranslateResult,
                reason: shouldTranslateResult ? 'translatable' : 'matches_exclusion_rule'
              });
            } else if (typeof value === 'object' && value !== null) {
              await testObject(value, currentPath);
            }
          }
        }
      };

      await testObject(test_data);

      const summary = {
        total_fields: results.length,
        translatable: results.filter(r => r.should_translate).length,
        non_translatable: results.filter(r => !r.should_translate).length
      };

      const response = successResponse(
        { summary, results },
        "Rule testing completed",
        { customerId: customer_id }
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to test rules", {
        customerId: customer_id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Get auto-detected patterns
   */
  getAutoDetectedPatterns: async (req, res) => {
    const { customer_id = 'default' } = req.query;

    try {
      const analytics = getConfigAnalytics(customer_id);
      const autoDetectedPatterns = analytics.autoDetectedPatterns;
      const patternFrequency = analytics.patternFrequency;

      // Enrich patterns with frequency data
      const enrichedPatterns = autoDetectedPatterns.map(pattern => ({
        pattern,
        frequency: patternFrequency[pattern] || 0,
        auto_detected: true
      }));

      const response = successResponse(
        {
          total_patterns: enrichedPatterns.length,
          patterns: enrichedPatterns
        },
        "Auto-detected patterns retrieved successfully",
        { customerId: customer_id }
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to get auto-detected patterns", {
        customerId: customer_id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Update auto-detection settings
   */
  updateAutoDetectionSettings: async (req, res) => {
    const { customer_id, settings } = req.body;

    if (!customer_id || !settings) {
      throw new ValidationError("Missing required fields: customer_id, settings");
    }

    try {
      const config = await getConfig(customer_id);
      
      // Update auto-detection settings
      config.autoDetection = {
        ...config.autoDetection,
        ...settings
      };

      // Save the updated configuration
      await configService.saveConfiguration();

      logger.info("Auto-detection settings updated", {
        customerId: customer_id,
        settings
      });

      const response = successResponse(
        { updated_settings: config.autoDetection },
        "Auto-detection settings updated successfully",
        { customerId: customer_id }
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to update auto-detection settings", {
        customerId: customer_id,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Get recommended patterns based on common industry practices
   */
  getRecommendedPatterns: async (req, res) => {
    const { industry, content_type } = req.query;

    const recommendations = {
      ecommerce: {
        keys: ['sku', 'barcode', 'upc', 'gtin', 'model_number', 'part_number', 'asin'],
        patterns: [/^[A-Z0-9]{4,}$/, /^\d{12,14}$/], // Product codes, barcodes
        description: 'E-commerce specific patterns for product identifiers'
      },
      cms: {
        keys: ['post_id', 'category_id', 'tag_id', 'author_id', 'template', 'widget_id'],
        patterns: [/^[a-z0-9-]+$/, /^widget_\w+$/], // Slugs, widget names
        description: 'Content management system patterns'
      },
      api: {
        keys: ['endpoint', 'method', 'status_code', 'response_time', 'request_id'],
        patterns: [/^[A-Z_]+$/, /^\d{3}$/, /^req_\w+$/], // Constants, HTTP codes, request IDs
        description: 'API documentation and response patterns'
      },
      saas: {
        keys: ['tenant_id', 'workspace_id', 'plan_id', 'feature_flag', 'api_endpoint'],
        patterns: [/^[a-f0-9-]{36}$/, /^flag_\w+$/], // UUIDs, feature flags
        description: 'SaaS platform specific patterns'
      }
    };

    const industryRecommendations = recommendations[industry] || recommendations.saas;

    const response = successResponse(
      {
        industry: industry || 'saas',
        content_type: content_type || 'general',
        recommendations: industryRecommendations
      },
      "Pattern recommendations retrieved successfully"
    );

    res.status(200).json(response);
  }
};

module.exports = translationConfigController; 