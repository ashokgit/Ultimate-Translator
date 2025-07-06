# Ultimate Translator

## Overview

**Ultimate Translator** is a comprehensive web-based translation service that can translate web content, individual strings, and entire JSON structures. It supports multiple translation providers including Google Translate, OpenAI, and HuggingFace models, making it a flexible solution for various translation needs.

## Key Features

### 🌐 Multiple Translation Sources
- **Google Translate API** - Fast and reliable translations with proxy support
- **OpenAI GPT Models** - High-quality contextual translations
- **HuggingFace Models** - Open-source ML-powered translations
- **Configurable Default Provider** - Set your preferred translation service

### 📄 Web Content Translation
- **URL-based Translation** - Input any web URL to translate its content
- **JSON Structure Preservation** - Maintains original data structure while translating text content
- **Content Caching** - Stores translated content to avoid redundant API calls
- **Multi-language Support** - Translate to multiple target languages simultaneously

### ✨ String Translation Service
- **Individual Text Translation** - Translate standalone text strings
- **Translation History** - Maintains logs of previous translations
- **Language Detection** - Automatic source language detection

### 🔧 Management Features
- **Translation Updates** - Edit and update existing translations
- **Source Management** - Update original source content
- **URL Management** - Manage and update translation source URLs
- **Filter & Search** - Find translations by URL, language, or content

## Architecture

```
├── Frontend (HTML/JS)     - Web interface for users
├── API Layer (Express)    - RESTful endpoints
├── Controllers           - Request handling logic
├── Services             - Business logic
├── Translators          - Translation provider integrations
├── Models              - MongoDB data structures
└── Database (MongoDB)   - Translation storage
```

## Prerequisites

- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **Docker & Docker Compose** (for containerized deployment)

## Installation & Setup

### 1. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ultimate-translator

# Default Translation Provider
DEFAULT_TRANSLATOR=huggingface  # Options: google, openai, huggingface

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here

# HuggingFace Configuration (if using HuggingFace)
HUGGINGFACE_API_URL=http://localhost:5000
```

### 2. Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Ultimate-Translator

# Copy environment file and configure
cp .env.example .env
# Edit .env file with your configuration

# Start all services
docker-compose -f docker-compose.dev.yml up -d --build

# The application will be available at:
# - Main App: http://localhost:3000 (or your configured PORT)
# - MongoDB: mongodb://localhost:27017

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 3. Manual Installation

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env file with your configuration

# Start MongoDB (ensure MongoDB is running)
# mongod

# Start the application
npm start

# For development with auto-restart
npm run dev
```


## Usage
- Browse: http://localhost:3000/
- First, setup API keys from the UI (set at-least one as default)
- Test out a few simple translations using Text Translation
- Then use Page Translation service
- To manage Tranalsted pages: Translation Management
- Source Management is still under developemnt
- Use api-docs/ to see the api endpoints

## API Documentation

### Core Translation Endpoints

#### Translate Web Page
```http
GET /api/v1/translate?source_url={url}&language={lang}&model_name={model}&content_id={id}
```

**Parameters:**
- `source_url`: URL of the web content to translate
- `language`: Target language code (e.g., 'es', 'fr', 'de')
- `model_name`: Translation model identifier
- `content_id`: Unique identifier for the content

#### Translate Text String
```http
POST /api/v1/translate-text
Content-Type: application/json

{
  "text": "Hello world",
  "target_language": "es",
  "model_name": "default"
}
```

#### Update Translation
```http
POST /api/v1/update-translation
Content-Type: application/json

{
  "content_id": "unique_id",
  "model_name": "model_name",
  "language": "es",
  "updatedJson": "{\"translated\": \"content\"}"
}
```

### Management Endpoints

#### Get Available Languages
```http
GET /api/v1/get-available-language
```

#### Filter Translations
```http
GET /api/v1/translation-filter?model_name={model}&language={lang}
```

#### Filter by URL
```http
GET /api/v1/filter-by-url?source_url={url}
```

#### Update Translation URL
```http
PUT /api/v1/update-translation-url
Content-Type: application/json

{
  "old_url": "https://old-url.com",
  "new_url": "https://new-url.com"
}
```

## Web Interface

The application provides a user-friendly web interface accessible at `http://localhost:3000` with the following pages:

- **Main Dashboard** (`/`) - Central hub with navigation to all features
- **Interceptor** (`/interceptor.html`) - Web content translation interface
- **String Translator** (`/string-translator.html`) - Individual text translation
- **Translation Updates** (`/update-translation.html`) - Edit existing translations
- **Source Management** (`/source-change.html`) - Update source content

## Translation Providers Configuration

### Google Translate
Uses the `@vitalets/google-translate-api` package with built-in proxy support for reliability.

### OpenAI
Requires an OpenAI API key. Configure in your `.env` file:
```env
DEFAULT_TRANSLATOR=openai
OPENAI_API_KEY=your_api_key_here
```

### HuggingFace
Uses a separate HuggingFace translation service running in Docker:
```env
DEFAULT_TRANSLATOR=huggingface
```

## Database Schema

### TranslatedPage Model
```javascript
{
  content_id: String,      // Unique identifier
  source_url: String,      // Original URL
  last_requested_at: Date, // Last access timestamp
  model_name: String,      // Translation model used
  source_data: Object,     // Original content structure
  translations: [Object]   // Array of language translations
}
```

### TranslationLog Model
```javascript
{
  text: String,           // Original text
  lang: String,          // Target language
  translated_text: String // Translated result
}
```

## Development

### Running Tests
```bash
npm test
```

### Project Structure
```
├── api/                 # API route definitions
├── controllers/         # Request handlers
├── db/                 # Database connection
├── helpers/            # Utility functions
├── models/             # MongoDB schemas
├── public/             # Static web files
├── services/           # Business logic
├── translators/        # Translation providers
├── validations/        # Input validation
└── test/              # Test files
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **Translation API Errors**
   - Verify API keys are correct
   - Check internet connectivity for external APIs
   - Ensure HuggingFace service is running (if using Docker)

3. **Proxy Issues (Google Translate)**
   - The application includes multiple proxy servers
   - If all proxies fail, try updating the proxy list in `GoogleTranslator.js`

### Logs
Check application logs for detailed error information:
```bash
docker-compose logs app
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For questions or issues, please review the codebase or contact the development team. 