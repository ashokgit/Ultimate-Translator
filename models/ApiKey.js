const mongoose = require("mongoose");
const crypto = require("crypto");
const logger = require('../utils/logger');

const apiKeySchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['openai', 'huggingface', 'google', 'custom'],
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Encrypted API key
  encryptedKey: {
    type: String,
    required: true
  },
  
  // Additional configuration for the provider
  config: {
    model: String,
    maxTokens: Number,
    temperature: Number,
    apiUrl: String,
    proxies: [String]
  },
  
  // Available models for this API key (for OpenAI)
  availableModels: [{
    id: String,
    name: String,
    description: String,
    maxTokens: Number,
    pricing: {
      input: Number,
      output: Number
    }
  }],
  
  // Status and usage tracking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  
  usageCount: {
    type: Number,
    default: 0
  },
  
  lastUsed: {
    type: Date
  },
  
  // Security and audit fields
  createdBy: {
    type: String,
    default: 'system'
  },
  
  expiresAt: {
    type: Date
  },
  
  // Rate limiting and quotas
  rateLimit: {
    requestsPerMinute: Number,
    requestsPerHour: Number,
    requestsPerDay: Number
  },
  
  quota: {
    totalRequests: Number,
    usedRequests: Number,
    resetDate: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
apiKeySchema.index({ provider: 1, isActive: 1 });
apiKeySchema.index({ isDefault: 1, provider: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if key is expired
apiKeySchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for checking if key has quota remaining
apiKeySchema.virtual('hasQuotaRemaining').get(function() {
  if (!this.quota.totalRequests) return true;
  return this.quota.usedRequests < this.quota.totalRequests;
});

// Pre-save middleware to encrypt API key
apiKeySchema.pre('save', function(next) {
  if (this.isModified('encryptedKey')) {
    const algorithm = 'aes-256-cbc';
    // Use a key from env or a default one (ensure it's 32 bytes)
    const key = process.env.ENCRYPTION_KEY ? 
                Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : 
                crypto.randomBytes(32);
    
    // The IV should be random for each encryption
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(this.encryptedKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Store IV with the encrypted key, separated by a colon
    this.encryptedKey = `${iv.toString('hex')}:${encrypted}`;
  }
  next();
});

// Method to decrypt API key
apiKeySchema.methods.decryptKey = function() {
  try {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY ? 
                Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : 
                null;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY is not set');
    }

    const parts = this.encryptedKey.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted key format. Could be an old key.');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt API key', { error: error.message });
    // Attempt to return the key as-is if it's an old, unencrypted one
    if (error.message.includes('Invalid encrypted key format')) {
      return this.encryptedKey;
    }
    throw new Error(`Failed to decrypt API key: ${error.message}`);
  }
};

// Method to increment usage
apiKeySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  if (this.quota.usedRequests !== undefined) {
    this.quota.usedRequests += 1;
  }
  return this.save();
};

// Method to check if key can be used
apiKeySchema.methods.canUse = function() {
  return this.isActive && 
         !this.isExpired && 
         this.hasQuotaRemaining;
};

// Static method to get default key for a provider
apiKeySchema.statics.getDefaultKey = function(provider) {
  return this.findOne({ 
    provider, 
    isDefault: true, 
    isActive: true 
  });
};

// Static method to get all active keys for a provider
apiKeySchema.statics.getActiveKeys = function(provider) {
  return this.find({ 
    provider, 
    isActive: true 
  }).sort({ isDefault: -1, createdAt: -1 });
};

const ApiKey = mongoose.model("ApiKey", apiKeySchema);

module.exports = ApiKey; 