const CircuitBreaker = require('opossum');
const logger = require('./logger');

class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Create or get a circuit breaker for a specific service
   */
  getBreaker(serviceName, options = {}) {
    if (this.breakers.has(serviceName)) {
      return this.breakers.get(serviceName);
    }

    const defaultOptions = {
      timeout: 30000, // 30 seconds
      errorThresholdPercentage: 50, // 50% error rate triggers open state
      resetTimeout: 30000, // 30 seconds to try again
      volumeThreshold: 10, // Minimum number of calls before considering error rate
      ...options
    };

    const breaker = new CircuitBreaker(async (fn, ...args) => {
      return await fn(...args);
    }, defaultOptions);

    // Event listeners for monitoring
    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${serviceName}`, {
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${serviceName}`, {
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${serviceName}`, {
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    });

    breaker.on('fallback', (result) => {
      logger.warn(`Circuit breaker fallback triggered for ${serviceName}`, {
        service: serviceName,
        fallbackResult: result,
        timestamp: new Date().toISOString()
      });
    });

    breaker.on('timeout', () => {
      logger.warn(`Circuit breaker timeout for ${serviceName}`, {
        service: serviceName,
        timeout: defaultOptions.timeout,
        timestamp: new Date().toISOString()
      });
    });

    breaker.on('reject', () => {
      logger.warn(`Circuit breaker rejected call for ${serviceName}`, {
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    });

    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(serviceName, fn, fallbackFn = null, options = {}) {
    const breaker = this.getBreaker(serviceName, options);
    
    if (fallbackFn) {
      breaker.fallback(fallbackFn);
    }

    return await breaker.fire(fn);
  }

  /**
   * Get status of all circuit breakers
   */
  getStatus() {
    const status = {};
    for (const [serviceName, breaker] of this.breakers) {
      status[serviceName] = {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
        threshold: breaker.options.errorThresholdPercentage,
        timeout: breaker.options.timeout,
        resetTimeout: breaker.options.resetTimeout
      };
    }
    return status;
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(serviceName) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.close();
      logger.info(`Circuit breaker manually reset for ${serviceName}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const [serviceName, breaker] of this.breakers) {
      breaker.close();
    }
    logger.info('All circuit breakers reset');
  }
}

// Create singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

module.exports = circuitBreakerManager; 