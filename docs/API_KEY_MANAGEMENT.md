# API Key Management System

## Overview

The Ultimate Translator now includes a comprehensive API key management system that allows you to securely store, manage, and use API keys for different translation providers. This system provides both database storage and environment variable fallback capabilities.

## Features

### 🔐 Secure Storage
- **Encrypted Storage**: API keys are encrypted before storing in the database
- **Environment Fallback**: Falls back to environment variables if database storage is disabled
- **Access Control**: API keys are never exposed in API responses

### 🎛️ Management Interface
- **Web UI**: User-friendly interface for managing API keys
- **CRUD Operations**: Create, read, update, and delete API keys
- **Bulk Operations**: Perform operations on multiple keys at once
- **Testing**: Test API keys before using them

### 🔄 Provider Support
- **OpenAI**: GPT models for translation
- **HuggingFace**: HuggingFace translation models
- **Google Translate**: Google Translate API
- **Custom**: Custom translation services

### 📊 Monitoring & Analytics
- **Usage Tracking**: Track how many times each key is used
- **Statistics**: View usage statistics and key status
- **Quota Management**: Set and monitor usage quotas
- **Rate Limiting**: Configure rate limits per key

## Quick Start

### 1. Access the Management Interface

Navigate to the API Key Management interface:
- **Simple Interface**: `http://localhost:3000/api-keys.html`
- **Advanced Interface**: `http://localhost:3000/api-key-management.html`
- **From Main Dashboard**: Click "API Key Management" card

### 2. Add Your First API Key

1. Click "Add New API Key"
2. Select your provider (OpenAI, HuggingFace, Google, or Custom)
3. Enter a name and description for the key
4. Paste your API key
5. Configure additional settings if needed
6. Click "Save API Key"

### 3. Set as Default

After adding your API key, you can set it as the default for that provider. Only one key per provider can be the default.

## API Endpoints

### Core Operations

#### Create API Key
```http
POST /api/v1/api-keys
Content-Type: application/json

{
  "provider": "openai",
  "name": "Production OpenAI Key",
  "description": "Main OpenAI key for production use",
  "apiKey": "sk-your-api-key-here",
  "isDefault": true,
  "isActive": true,
  "config": {
    "model": "gpt-3.5-turbo",
    "maxTokens": 1000,
    "temperature": 0.7
  }
}
```

#### Get All API Keys
```http
GET /api/v1/api-keys
GET /api/v1/api-keys?provider=openai
```

#### Get Specific API Key
```http
GET /api/v1/api-keys/{id}
```

#### Update API Key
```http
PUT /api/v1/api-keys/{id}
Content-Type: application/json

{
  "name": "Updated Key Name",
  "isActive": false,
  "config": {
    "model": "gpt-4"
  }
}
```

#### Delete API Key
```http
DELETE /api/v1/api-keys/{id}
```

### Testing & Validation

#### Test API Key
```http
POST /api/v1/api-keys/{id}/test
```

#### Set Default API Key
```http
PUT /api/v1/api-keys/{id}/default
```

### Bulk Operations

#### Bulk Operations
```http
POST /api/v1/api-keys/bulk
Content-Type: application/json

{
  "operation": "activate",
  "ids": ["id1", "id2", "id3"]
}
```

### Statistics & Information

#### Get API Key Statistics
```http
GET /api/v1/api-keys/stats
```

#### Get Available Providers
```http
GET /api/v1/api-keys/providers
```

#### Initialize from Environment
```http
POST /api/v1/api-keys/initialize-env
```

## Configuration

### Environment Variables

The system can be configured using the following environment variables:

```env
# API Key Management Configuration
ENCRYPTION_KEY=your-32-character-encryption-key
ENABLE_API_KEY_DB_STORAGE=true
FALLBACK_TO_ENV_VARS=true

# Provider-specific environment variables (fallback)
OPENAI_API_KEY=sk-your-openai-key
HUGGINGFACE_API_KEY=hf-your-huggingface-key
GOOGLE_TRANSLATE_API_KEY=your-google-key

# OpenAI Configuration
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# HuggingFace Configuration
HUGGINGFACE_API_URL=https://api-inference.huggingface.co

# Google Translate Configuration
GOOGLE_TRANSLATE_PROXIES=proxy1,proxy2,proxy3
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `ENCRYPTION_KEY` | 32-character key for encrypting API keys | `default-encryption-key-32-chars-long` |
| `ENABLE_API_KEY_DB_STORAGE` | Enable database storage for API keys | `true` |
| `FALLBACK_TO_ENV_VARS` | Fallback to environment variables | `true` |

## Database Schema

### ApiKey Model

```javascript
{
  provider: String,           // 'openai', 'huggingface', 'google', 'custom'
  name: String,               // Human-readable name
  description: String,        // Optional description
  encryptedKey: String,       // Encrypted API key
  config: Object,             // Provider-specific configuration
  isActive: Boolean,          // Whether the key is active
  isDefault: Boolean,         // Whether this is the default key for the provider
  usageCount: Number,         // Number of times used
  lastUsed: Date,             // Last usage timestamp
  createdBy: String,          // Who created the key
  expiresAt: Date,            // Optional expiration date
  rateLimit: Object,          // Rate limiting configuration
  quota: Object,              // Usage quota configuration
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Last update timestamp
}
```

## Security Features

### Encryption
- API keys are encrypted using AES-256-CBC before storage
- Encryption key is configurable via environment variable
- Decryption only happens when keys are needed for API calls

### Access Control
- API keys are never returned in API responses
- Only metadata and usage statistics are exposed
- Keys are decrypted only when needed for translation services

### Validation
- Comprehensive input validation for all API key operations
- Provider-specific validation rules
- Rate limiting and quota enforcement

## Integration with Translation Services

The API key management system is seamlessly integrated with the existing translation services:

### Automatic Key Selection
- Translation services automatically use the default key for each provider
- Fallback to environment variables if no database key is available
- Automatic key rotation and failover capabilities

### Usage Tracking
- Each API call increments the usage counter
- Last used timestamp is updated automatically
- Quota enforcement prevents overuse

### Configuration Management
- Provider-specific configurations are stored with each key
- Model selection, token limits, and other settings are preserved
- Easy switching between different configurations

## Usage Examples

### Adding an OpenAI Key
```javascript
const response = await fetch('/api/v1/api-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    name: 'Production OpenAI Key',
    description: 'Main key for production translations',
    apiKey: 'sk-your-actual-key',
    isDefault: true,
    config: {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.5
    }
  })
});
```

### Testing a Key
```javascript
const response = await fetch(`/api/v1/api-keys/${keyId}/test`, {
  method: 'POST'
});

const result = await response.json();
console.log(result.data.testResult.message);
```

### Getting Statistics
```javascript
const response = await fetch('/api/v1/api-keys/stats');
const stats = await response.json();

console.log('Total keys:', stats.data.length);
console.log('Active keys:', stats.data.filter(s => s.activeKeys > 0).length);
```

## Troubleshooting

### Common Issues

#### "No API key found for provider"
- Check if you have a default key set for the provider
- Verify that the key is active and not expired
- Check if environment variables are set (if fallback is enabled)

#### "Invalid API key"
- Test the key using the test endpoint
- Verify the key format for the specific provider
- Check if the key has sufficient quota/credits

#### "Encryption error"
- Verify that the `ENCRYPTION_KEY` environment variable is set
- Ensure the key is exactly 32 characters long
- Check if the key was changed after keys were already stored

### Debug Mode

Enable debug logging by setting the log level:

```env
LOG_LEVEL=debug
```

This will provide detailed information about API key operations and any issues.

## Best Practices

### Security
1. **Use Strong Encryption Keys**: Generate a strong 32-character encryption key
2. **Rotate Keys Regularly**: Update API keys periodically
3. **Monitor Usage**: Keep track of key usage and set appropriate quotas
4. **Limit Access**: Only give access to trusted users

### Management
1. **Use Descriptive Names**: Give keys meaningful names for easy identification
2. **Set Expiration Dates**: Use expiration dates for temporary keys
3. **Test Before Use**: Always test keys before setting them as default
4. **Backup Configuration**: Keep backups of your API key configurations

### Performance
1. **Use Appropriate Quotas**: Set realistic usage quotas to prevent overuse
2. **Monitor Rate Limits**: Configure rate limits based on provider capabilities
3. **Cache When Possible**: Use caching to reduce API calls
4. **Load Balance**: Use multiple keys for high-traffic applications

## Migration from Environment Variables

If you're currently using environment variables for API keys, you can easily migrate to the database system:

1. **Enable Database Storage**: Set `ENABLE_API_KEY_DB_STORAGE=true`
2. **Initialize from Environment**: Use the `/api/v1/api-keys/initialize-env` endpoint
3. **Verify Keys**: Test the imported keys to ensure they work
4. **Set Defaults**: Set appropriate keys as default for each provider
5. **Monitor Usage**: Start monitoring usage through the new system

## API Response Format

All API responses follow a consistent format:

```javascript
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "metadata": {
    // Additional metadata
  }
}
```

Error responses:

```javascript
{
  "success": false,
  "error": "Error message",
  "details": [
    // Validation errors or additional details
  ]
}
```

## Support

For issues or questions about the API key management system:

1. Check the troubleshooting section above
2. Review the logs for detailed error information
3. Test individual components using the provided test endpoints
4. Verify your configuration and environment variables

The API key management system is designed to be robust, secure, and easy to use while providing the flexibility needed for production environments. 