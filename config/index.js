const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' 
      ? 'mongodb://mongo:27017/ultimate_translator' 
      : 'mongodb://localhost:27017/ultimate_translator_dev'),
  },

  // Translation Configuration
  translation: {
    defaultProvider: process.env.DEFAULT_TRANSLATOR || 'openai',
    cacheTimeout: parseInt(process.env.TRANSLATION_CACHE_TTL) || 3600,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TRANSLATIONS) || 10,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  },

  // OpenAI Configuration (fallback to environment variables)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
  },

  // HuggingFace Configuration
  huggingface: {
    apiUrl: process.env.NODE_ENV === 'production' 
      ? process.env.HUGGINGFACE_API_URL 
      : (process.env.HUGGINGFACE_API_URL_LOCAL || process.env.HUGGINGFACE_API_URL || 'http://localhost:5000'),
  },

  // Google Translate Configuration
  google: {
    proxies: process.env.GOOGLE_TRANSLATE_PROXIES 
      ? process.env.GOOGLE_TRANSLATE_PROXIES.split(',').map(proxy => proxy.trim())
      : [],
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'simple',
  },

  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
  },

  // API Key Management Configuration
  apiKeyManagement: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    enableDatabaseStorage: process.env.ENABLE_API_KEY_DB_STORAGE !== 'false', // Default to true
    fallbackToEnvVars: process.env.FALLBACK_TO_ENV_VARS !== 'false', // Default to true
  },
};

module.exports = config; 