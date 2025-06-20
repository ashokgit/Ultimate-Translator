const winston = require('winston');
const config = require('../config');

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Production format
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.server.nodeEnv === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { 
    service: 'ultimate-translator',
    environment: config.server.nodeEnv 
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Add file transport for production
if (config.server.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    handleExceptions: true,
    handleRejections: true,
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    handleExceptions: true,
    handleRejections: true,
  }));
}

// Helper methods for common use cases
logger.logRequest = (req, res, responseTime) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
  });
};

logger.logTranslation = (provider, sourceText, targetLang, success = true, error = null) => {
  const logData = {
    provider,
    targetLanguage: targetLang,
    textLength: sourceText?.length || 0,
    success,
  };
  
  if (error) {
    logger.error('Translation failed', { ...logData, error: error.message, stack: error.stack });
  } else {
    logger.info('Translation completed', logData);
  }
};

logger.logDatabaseOperation = (operation, collection, success = true, error = null, executionTime = null) => {
  const logData = {
    operation,
    collection,
    success,
    executionTime: executionTime ? `${executionTime}ms` : undefined,
  };
  
  if (error) {
    logger.error('Database operation failed', { ...logData, error: error.message });
  } else {
    logger.debug('Database operation completed', logData);
  }
};

module.exports = logger; 