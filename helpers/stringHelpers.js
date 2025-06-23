const TranslationConfigService = require('../services/TranslationConfigService');

// Create a singleton instance
const configService = new TranslationConfigService();

const isURL = (str) => {
  // Enhanced URL detection covering more patterns
  const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(str) || str.includes('www.') || str.includes('.com') || str.includes('.org');
};

const isPrice = (str) => {
  // Detect various price formats: ¥15,000-30,000, $100, €50-100, etc.
  const priceRegex = /^[¥$€£₹]\d+[\d,\-\+\/\s]*[¥$€£₹]?$|^\d+[\d,\-\+\/\s]*[¥$€£₹]$/i;
  return priceRegex.test(str);
};

const isDate = (str) => {
  // Detect date formats: March-May, 2023-2024, 10/15/2023, etc.
  const dateRegex = /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$|^\w+-\w+$|^\d{4}-\d{4}$/i;
  return dateRegex.test(str);
};

const isTime = (str) => {
  // Detect time formats: 10 AM, 2:30 PM, 75 minutes, etc.
  const timeRegex = /^\d{1,2}:\d{2}|^\d+\s*(AM|PM|minutes?|hours?|mins?|hrs?)\b/i;
  return timeRegex.test(str);
};

const isNumericOnly = (str) => {
  // Pure numbers or numbers with basic separators
  return /^\d+[\d,\.\-\+\s]*$/.test(str);
};

const isEmail = (str) => {
  // Basic email detection
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
};

const isPhoneNumber = (str) => {
  // Detect phone numbers with various formats
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,}$/;
  return phoneRegex.test(str) && str.replace(/\D/g, '').length >= 7;
};

const isCoordinate = (str) => {
  // GPS coordinates or similar technical data
  const coordRegex = /^[\-]?\d+\.\d+[,\s]+[\-]?\d+\.\d+$|^UTC[+\-]\d+$/i;
  return coordRegex.test(str);
};

const isCode = (str) => {
  // Technical codes, IDs, etc.
  const codeRegex = /^[A-Z]{2,}\d+|^[A-Z]+[-_][A-Z0-9]+|^#[A-Za-z0-9]+$/;
  return codeRegex.test(str);
};

/**
 * Enhanced shouldTranslate function with dynamic configuration support
 * @param {string} value - The value to check
 * @param {string} key - The key name (optional)
 * @param {string} customerId - Customer ID for custom rules (optional)
 * @returns {Promise<boolean>} - Whether the value should be translated
 */
const shouldTranslate = async (value, key = '', customerId = 'default') => {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  
  // Length constraints
  if (value.length > 500) return false; // Too long for translation
  if (value.length < 2) return false; // Too short to be meaningful
  
  // Use configuration service for advanced checking
  const shouldTranslateKey = await configService.shouldTranslateKey(key, value, customerId);
  if (!shouldTranslateKey) return false;
  
  // Legacy content type checks (as fallback)
  if (isNumericOnly(value)) return false;
  if (isURL(value)) return false;
  if (isPrice(value)) return false;
  if (isDate(value)) return false;
  if (isTime(value)) return false;
  if (isEmail(value)) return false;
  if (isPhoneNumber(value)) return false;
  if (isCoordinate(value)) return false;
  if (isCode(value)) return false;
  
  return true;
};

/**
 * Synchronous version of shouldTranslate for backward compatibility
 * Uses cached configuration and basic rules only
 */
const shouldTranslateSync = (value, key = '') => {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  
  // Length constraints
  if (value.length > 500) return false;
  if (value.length < 2) return false;
  
  // Basic content type checks
  if (isNumericOnly(value)) return false;
  if (isURL(value)) return false;
  if (isPrice(value)) return false;
  if (isDate(value)) return false;
  if (isTime(value)) return false;
  if (isEmail(value)) return false;
  if (isPhoneNumber(value)) return false;
  if (isCoordinate(value)) return false;
  if (isCode(value)) return false;
  
  // Basic key-based exclusions (most common patterns)
  const basicNonTranslatableKeys = [
    'id', 'url', 'slug', 'code', 'api_key', 'token', 'hash',
    'timezone', 'currency', 'language', 'lat', 'lng', 'coordinates',
    'created_at', 'updated_at', 'timestamp', 'version'
  ];
  
  if (basicNonTranslatableKeys.some(excludeKey => 
    key.toLowerCase().includes(excludeKey.toLowerCase())
  )) return false;
  
  return true;
};

/**
 * Auto-detect and learn from data patterns
 * @param {Object} data - Data to analyze
 * @param {string} customerId - Customer ID for learning
 */
const learnFromData = async (data, customerId = 'default') => {
  await configService.autoDetectPatterns(data, customerId);
};

/**
 * Add custom translation rule for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} rule - Rule object with type and pattern
 */
const addCustomRule = async (customerId, rule) => {
  await configService.addCustomerRule(customerId, rule);
};

/**
 * Get configuration analytics
 * @param {string} customerId - Customer ID
 * @returns {Object} Analytics data
 */
const getConfigAnalytics = (customerId = 'default') => {
  return configService.getAnalytics(customerId);
};

const makeSlug = (str) => {
  if (!str) return '';
  
  // For non-Latin scripts, use transliteration or fallback
  const slug = str
    .toLowerCase()
    .trim()
    // Handle non-English characters better
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // If slug is empty (non-Latin characters), create a fallback
  if (!slug || slug.length === 0) {
    // Use a hash of the original string as fallback
    const hash = str.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    return `content-${hash}`;
  }
  
  return slug;
};

const needsUrl = (obj) => {
  // Only generate URLs for very specific content types
  
  // 1. Objects with explicit content types that warrant URLs
  const urlWorthyTypes = ['attraction', 'destination', 'restaurant', 'hotel', 'activity', 'guide', 'article', 'page'];
  if (obj.type && urlWorthyTypes.includes(obj.type.toLowerCase())) {
    return true;
  }
  
  // 2. Root content objects (top-level pages)
  if (obj.model_name && obj.overview) {
    return true;
  }
  
  // 3. Main content items with substantial descriptive content
  // Must have name/title AND description AND be substantial
  const hasName = obj.name && typeof obj.name === 'string' && obj.name.length > 0;
  const hasTitle = obj.title && typeof obj.title === 'string' && obj.title.length > 0;
  const hasDescription = obj.description && typeof obj.description === 'string' && obj.description.length > 20;
  
  if ((hasName || hasTitle) && hasDescription && Object.keys(obj).length >= 4) {
    // Additional check: must not be technical/config objects or food items
    const excludedKeys = [
      'endpoint', 'method', 'payload', 'api_key', 'token', 'config', 'setting', 'param',
      'price_range', 'where_to_try', 'ingredients', 'recipe', 'cuisine_type',
      'luxury', 'mid_range', 'budget', 'from_airport', 'local_transport'
    ];
    const hasExcludedKeys = Object.keys(obj).some(key => 
      excludedKeys.some(excludeKey => key.toLowerCase().includes(excludeKey.toLowerCase()))
    );
    
    if (!hasExcludedKeys) {
      return true;
    }
  }
  
  return false;
};

/**
 * Initialize the configuration service
 * Call this at application startup
 */
const initializeConfig = async () => {
  await configService.initialize();
};

/**
 * Get current configuration for a customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Configuration object
 */
const getConfig = async (customerId = 'default') => {
  return await configService.getConfig(customerId);
};

module.exports = {
  // Core detection functions
  isURL,
  isPrice,
  isDate,
  isTime,
  isNumericOnly,
  isEmail,
  isPhoneNumber,
  isCoordinate,
  isCode,
  
  // Translation decision functions
  shouldTranslate,
  shouldTranslateSync, // For backward compatibility
  
  // Utility functions
  makeSlug,
  needsUrl,
  
  // Configuration management
  initializeConfig,
  getConfig,
  learnFromData,
  addCustomRule,
  getConfigAnalytics,
  
  // Service access
  configService
};
