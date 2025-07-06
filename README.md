# Ultimate Translator

## Overview

**Ultimate Translator** is a comprehensive web-based translation service that can translate web content, individual strings, and entire JSON structures. It supports multiple translation providers including Google Translate, OpenAI (tested), and HuggingFace models, making it a flexible solution for various translation needs.

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