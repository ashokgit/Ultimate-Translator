# Model Selection for OpenAI API Keys

This document describes the model selection functionality that has been added to the API key management system, specifically for OpenAI API keys.

## Overview

The model selection feature allows users to:
- View available OpenAI models for their API keys
- Refresh the list of available models from OpenAI's API
- Validate model selections when creating or updating API keys
- Use different models for different translation tasks

## Features

### 1. Available Models Endpoint

**GET** `/api/v1/api-keys/:id/models`

Retrieves the list of available models for a specific OpenAI API key.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "gpt-4",
        "name": "gpt-4",
        "description": "Most capable GPT-4 model for complex tasks",
        "maxTokens": 8192,
        "pricing": {
          "input": 0.03,
          "output": 0.06
        }
      },
      {
        "id": "gpt-3.5-turbo",
        "name": "gpt-3.5-turbo",
        "description": "Most capable GPT-3.5 model",
        "maxTokens": 4096,
        "pricing": {
          "input": 0.0015,
          "output": 0.002
        }
      }
    ],
    "lastUpdated": "2024-01-20T10:30:00.000Z",
    "cached": true
  },
  "message": "Available models retrieved successfully"
}
```

### 2. Refresh Models Endpoint

**POST** `/api/v1/api-keys/:id/models/refresh`

Fetches the latest list of available models from OpenAI's API and updates the cached list.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [...],
    "lastUpdated": "2024-01-20T10:30:00.000Z",
    "cached": false
  },
  "message": "Available models refreshed successfully"
}
```

### 3. Model Validation

When creating or updating OpenAI API keys, the system validates the model against:
- A predefined list of known OpenAI models
- The actual available models for the API key (if cached)

**Supported Models:**
- `gpt-4` - Most capable GPT-4 model for complex tasks
- `gpt-4-turbo` - Latest GPT-4 model with improved performance
- `gpt-4-turbo-preview` - Preview version of GPT-4 Turbo
- `gpt-4-32k` - GPT-4 model with 32k context window
- `gpt-4-1106-preview` - GPT-4 model optimized for chat
- `gpt-3.5-turbo` - Most capable GPT-3.5 model
- `gpt-3.5-turbo-16k` - GPT-3.5 model with 16k context window
- `text-davinci-003` - Legacy GPT-3 model for text completion
- `text-curie-001` - Legacy GPT-3 model for text completion
- `text-babbage-001` - Legacy GPT-3 model for text completion
- `text-ada-001` - Legacy GPT-3 model for text completion

## Usage Examples

### Creating an API Key with a Specific Model

```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "name": "GPT-4 Translation Key",
    "description": "API key for high-quality translations",
    "apiKey": "sk-your-api-key-here",
    "config": {
      "model": "gpt-4",
      "maxTokens": 4000,
      "temperature": 0.3
    },
    "isActive": true
  }'
```

### Updating an API Key's Model

```bash
curl -X PUT http://localhost:3000/api/v1/api-keys/:id \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "model": "gpt-4-turbo",
      "maxTokens": 8000
    }
  }'
```

### Getting Available Models

```bash
curl -X GET http://localhost:3000/api/v1/api-keys/:id/models
```

### Refreshing Available Models

```bash
curl -X POST http://localhost:3000/api/v1/api-keys/:id/models/refresh
```

## Database Schema Changes

The `ApiKey` model has been extended to include:

```javascript
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
}]
```

## Error Handling

The system handles various error scenarios:

1. **Invalid API Key ID**: Returns 404 Not Found
2. **Non-OpenAI API Key**: Returns 400 Bad Request with message "Model listing is only available for OpenAI API keys"
3. **Inactive API Key**: Returns 400 Bad Request when trying to refresh models
4. **Invalid Model**: Returns 400 Bad Request when creating/updating with unsupported model
5. **API Key Decryption Failure**: Returns 500 Internal Server Error

## Configuration

The model selection feature is automatically enabled for all OpenAI API keys. No additional configuration is required.

## Testing

Run the model selection tests:

```bash
npm test -- --grep "Model Selection"
```

## Security Considerations

1. **API Key Encryption**: All API keys are encrypted before storage
2. **Model Validation**: Models are validated against known lists to prevent injection attacks
3. **Access Control**: Model information is only available to authenticated users
4. **Rate Limiting**: Model refresh operations are subject to rate limiting

## Future Enhancements

1. **Model Performance Tracking**: Track translation quality and speed for different models
2. **Automatic Model Selection**: Automatically select the best model based on content type and length
3. **Model Cost Optimization**: Suggest cost-effective models for different use cases
4. **Custom Model Support**: Support for fine-tuned or custom OpenAI models
5. **Model Comparison**: Tools to compare translation quality across different models

## Troubleshooting

### Common Issues

1. **"Model not available" error**: The model may not be available for your API key. Try refreshing the model list.
2. **"Cannot fetch models" error**: Check if your API key is active and has the necessary permissions.
3. **"Invalid model" error**: Ensure you're using a supported model name from the list above.

### Debug Information

Enable debug logging to see detailed information about model operations:

```bash
LOG_LEVEL=debug npm start
```

## API Reference

For complete API documentation, see the main API documentation or run the server and visit `/api/v1/api-keys/providers` for provider-specific information. 