const { OpenAI } = require('openai');

// Test data fixtures to avoid API calls during testing
const testData = {
  // Sample translation requests
  validTranslationRequests: {
    simple: {
      text: "Hello world",
      language: "es",
      expected: "Hola mundo"
    },
    complex: {
      text: "The Ultimate Translator is a sophisticated web-based translation platform.",
      language: "fr", 
      expected: "L'Ultimate Translator est une plateforme de traduction sophistiquée basée sur le web."
    },
    withSpecialChars: {
      text: "Welcome to our café! We serve 100% organic coffee ☕",
      language: "de",
      expected: "Willkommen in unserem Café! Wir servieren 100% Bio-Kaffee ☕"
    }
  },

  // Page translation test data
  pageTranslationRequests: {
    blog: {
      model_name: "blog",
      language: "es",
      source_url: "https://example.com/content.json",
      content_id: "blog123",
      sourceData: {
        title: "How to Use Translation APIs",
        content: "Translation APIs are powerful tools for international applications.",
        tags: ["translation", "api", "international"]
      },
      expectedTranslation: {
        title: "Cómo usar APIs de traducción",
        content: "Las APIs de traducción son herramientas poderosas para aplicaciones internacionales.",
        tags: ["traducción", "api", "internacional"]
      }
    },
    ecommerce: {
      model_name: "product",
      language: "fr",
      source_url: "https://example.com/product.json",
      content_id: "prod456",
      sourceData: {
        name: "Premium Coffee Beans",
        description: "High-quality arabica coffee beans from Colombia",
        price: "$29.99",
        category: "beverages"
      },
      expectedTranslation: {
        name: "Grains de Café Premium",
        description: "Grains de café arabica de haute qualité de Colombie",
        price: "$29.99",
        category: "boissons"
      }
    }
  },

  // Cached translations (to simulate existing cache)
  cachedTranslations: [
    {
      text: "Hello",
      lang: "es",
      translated_text: "Hola"
    },
    {
      text: "Thank you",
      lang: "fr", 
      translated_text: "Merci"
    },
    {
      text: "Good morning",
      lang: "de",
      translated_text: "Guten Morgen"
    }
  ],

  // Sample translated pages (for database)
  translatedPages: [
    {
      content_id: "test123",
      source_url: "https://example.com/test.json",
      model_name: "blog",
      source_data: {
        title: "Test Article",
        content: "This is a test article"
      },
      translations: [
        {
          es: {
            title: "Artículo de Prueba",
            content: "Este es un artículo de prueba"
          }
        },
        {
          fr: {
            title: "Article de Test",
            content: "Ceci est un article de test"
          }
        }
      ],
      last_requested_at: new Date()
    }
  ],

  // Invalid data for validation testing
  invalidRequests: {
    emptyText: {
      text: "",
      language: "es"
    },
    invalidLanguage: {
      text: "Hello",
      language: "invalid-lang"
    },
    tooLongText: {
      text: "a".repeat(51000), // Exceeds 50KB limit
      language: "es"
    },
    invalidUrl: {
      model_name: "test",
      language: "es",
      source_url: "not-a-url",
      content_id: "test123"
    },
    invalidJson: {
      content_id: "test123",
      model_name: "test",
      language: "es",
      updatedJson: "{ invalid json }"
    }
  },

  // Mock API responses
  mockApiResponses: {
    openai: {
      success: {
        choices: [{
          message: {
            content: "Hola mundo"
          }
        }],
        usage: {
          total_tokens: 15
        }
      },
      rateLimitError: {
        status: 429,
        message: "Rate limit exceeded",
        name: "APIError"
      },
      invalidApiKey: {
        status: 401,
        message: "Invalid API key",
        name: "APIError"
      }
    },
    google: {
      success: {
        text: "Hola mundo"
      }
    },
    huggingface: {
      success: {
        data: {
          translated_text: "Hola mundo"
        }
      },
      serviceUnavailable: {
        request: {},
        message: "Service unavailable"
      }
    }
  },

  // Test URLs for JSON fetching
  testUrls: {
    valid: "https://jsonplaceholder.typicode.com/posts/1",
    invalidDomain: "https://invalid-domain-12345.com/test.json",
    malformed: "not-a-url-at-all"
  }
};

module.exports = testData; 