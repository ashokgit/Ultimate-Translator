const logger = require('./logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        responseTimes: []
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {}
      },
      translations: {
        total: 0,
        byProvider: {},
        averageTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      },
      memory: {
        samples: [],
        peak: 0
      }
    };
    
    this.startTime = Date.now();
    
    // Start periodic memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Record request metrics
   */
  recordRequest(method, endpoint, responseTime, statusCode) {
    this.metrics.requests.total++;
    
    // Track by method
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // Track by endpoint
    this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
    
    // Track response times (keep last 1000)
    this.metrics.requests.responseTimes.push(responseTime);
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes.shift();
    }
    
    // Track errors
    if (statusCode >= 400) {
      this.metrics.errors.total++;
      this.metrics.errors.byEndpoint[endpoint] = (this.metrics.errors.byEndpoint[endpoint] || 0) + 1;
    }
  }

  /**
   * Record translation metrics
   */
  recordTranslation(provider, responseTime, cacheHit = false) {
    this.metrics.translations.total++;
    this.metrics.translations.byProvider[provider] = (this.metrics.translations.byProvider[provider] || 0) + 1;
    
    if (cacheHit) {
      this.metrics.translations.cacheHits++;
    } else {
      this.metrics.translations.cacheMisses++;
    }
    
    // Update average time
    const currentAvg = this.metrics.translations.averageTime;
    const total = this.metrics.translations.total;
    this.metrics.translations.averageTime = ((currentAvg * (total - 1)) + responseTime) / total;
  }

  /**
   * Record error
   */
  recordError(errorType, endpoint) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    this.metrics.errors.byEndpoint[endpoint] = (this.metrics.errors.byEndpoint[endpoint] || 0) + 1;
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        timestamp: Date.now()
      };
      
      this.metrics.memory.samples.push(memUsageMB);
      
      // Keep last 100 samples
      if (this.metrics.memory.samples.length > 100) {
        this.metrics.memory.samples.shift();
      }
      
      // Update peak memory
      if (memUsageMB.heapUsed > this.metrics.memory.peak) {
        this.metrics.memory.peak = memUsageMB.heapUsed;
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.metrics.requests.responseTimes.length > 0 
      ? this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTimes.length 
      : 0;
    
    const cacheHitRate = this.metrics.translations.total > 0 
      ? (this.metrics.translations.cacheHits / this.metrics.translations.total) * 100 
      : 0;
    
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.errors.total / this.metrics.requests.total) * 100 
      : 0;
    
    const currentMemory = this.metrics.memory.samples.length > 0 
      ? this.metrics.memory.samples[this.metrics.memory.samples.length - 1] 
      : null;
    
    return {
      uptime: {
        milliseconds: uptime,
        formatted: `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m ${Math.floor((uptime % 60000) / 1000)}s`
      },
      requests: {
        total: this.metrics.requests.total,
        byMethod: this.metrics.requests.byMethod,
        byEndpoint: this.metrics.requests.byEndpoint,
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      },
      translations: {
        total: this.metrics.translations.total,
        byProvider: this.metrics.translations.byProvider,
        averageTime: Math.round(this.metrics.translations.averageTime),
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        cacheHits: this.metrics.translations.cacheHits,
        cacheMisses: this.metrics.translations.cacheMisses
      },
      errors: {
        total: this.metrics.errors.total,
        byType: this.metrics.errors.byType,
        byEndpoint: this.metrics.errors.byEndpoint
      },
      memory: {
        current: currentMemory,
        peak: this.metrics.memory.peak,
        samples: this.metrics.memory.samples.length
      }
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, byMethod: {}, byEndpoint: {}, responseTimes: [] },
      errors: { total: 0, byType: {}, byEndpoint: {} },
      translations: { total: 0, byProvider: {}, averageTime: 0, cacheHits: 0, cacheMisses: 0 },
      memory: { samples: [], peak: 0 }
    };
    this.startTime = Date.now();
    logger.info("Performance metrics reset");
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor; 