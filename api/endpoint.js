const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const { validators } = require("../utils/validation");
const { asyncHandler } = require("../utils/errorHandler");

//Imports from Controller
const {
  translatePage,
  translationFilter,
  updateTranslation,
  filterByUrl,
} = require("../controllers/TranslateController");
const axios = require("axios");
const { changeSource } = require("../controllers/SourceController");
const {
  translateString,
} = require("../controllers/StringTranslatorController");
const { filterList, getModelNames, deleteTranslation } = require("../controllers/TranslatedListController");
const filterAndGroup = require("../services/FilterAndGroupTranslationService");
const {
  availableLanguages,
} = require("../controllers/AvailableLanguageController");
const {
  updateTranslationUrl,
} = require("../controllers/TranslationUrlController");
const sampleController = require("../controllers/SampleController");
const translationConfigController = require("../controllers/TranslationConfigController");

// Sample Data for Ultimate Translator Showcase
const sampleData = {
  // E-commerce Product Catalog
  "sample/ecommerce-product": {
    id: "prod_001",
    name: "Premium Wireless Headphones",
    category: "Electronics",
    brand: "AudioTech Pro",
    price: {
      amount: 299.99,
      currency: "USD",
      discounted_price: 249.99,
      discount_percentage: 17
    },
    description: "Experience crystal-clear audio with our flagship wireless headphones. Featuring advanced noise cancellation, 30-hour battery life, and premium materials for ultimate comfort.",
    features: [
      "Active Noise Cancellation (ANC)",
      "30-hour battery life with quick charge",
      "Premium leather and memory foam padding",
      "Bluetooth 5.2 with multipoint connection",
      "Hi-Res Audio certified",
      "Voice assistant integration"
    ],
    specifications: {
      weight: "280g",
      driver_size: "40mm",
      frequency_response: "20Hz - 40kHz",
      impedance: "32 ohms",
      charging_time: "2 hours",
      wireless_range: "30 meters"
    },
    reviews: {
      average_rating: 4.7,
      total_reviews: 1247,
      rating_distribution: {
        "5_star": 68,
        "4_star": 22,
        "3_star": 7,
        "2_star": 2,
        "1_star": 1
      }
    },
    availability: {
      in_stock: true,
      stock_count: 156,
      shipping: {
        free_shipping: true,
        estimated_delivery: "2-3 business days",
        international_shipping: true
      }
    },
    seo: {
      meta_title: "Premium Wireless Headphones - AudioTech Pro | Best Sound Quality",
      meta_description: "Shop AudioTech Pro Premium Wireless Headphones with ANC, 30hr battery, and Hi-Res Audio. Free shipping & 2-year warranty.",
      keywords: ["wireless headphones", "noise cancellation", "premium audio", "bluetooth headphones"]
    }
  },

  // Blog Article
  "sample/blog-article": {
    id: "blog_001",
    title: "The Future of Artificial Intelligence in Modern Business",
    subtitle: "How AI is Transforming Industries and Creating New Opportunities",
    author: {
      name: "Dr. Sarah Chen",
      bio: "AI Research Director with 15 years of experience in machine learning and business transformation",
      image: "/images/authors/sarah-chen.jpg",
      social: {
        linkedin: "https://linkedin.com/in/sarahchen",
        twitter: "@sarahchen_ai"
      }
    },
    published_date: "2024-01-15T09:00:00Z",
    updated_date: "2024-01-16T14:30:00Z",
    reading_time: "8 minutes",
    category: "Technology",
    tags: ["Artificial Intelligence", "Business Transformation", "Machine Learning", "Innovation", "Future Tech"],
    content: {
      introduction: "Artificial Intelligence is no longer a futuristic concept—it's here, and it's revolutionizing how businesses operate across every industry. From healthcare to finance, retail to manufacturing, AI is creating unprecedented opportunities for growth, efficiency, and innovation.",
      sections: [
        {
          heading: "AI in Healthcare: Saving Lives Through Technology",
          content: "Medical AI systems are now capable of diagnosing diseases with accuracy that matches or exceeds human specialists. Machine learning algorithms analyze medical images, predict patient outcomes, and even assist in drug discovery, reducing development time from decades to years."
        },
        {
          heading: "Financial Services: Smart Money Management",
          content: "Banks and financial institutions use AI for fraud detection, risk assessment, and personalized financial advice. Robo-advisors manage portfolios, while AI-powered chatbots handle customer service 24/7, improving both efficiency and customer satisfaction."
        },
        {
          heading: "Retail Revolution: Personalized Shopping Experiences",
          content: "E-commerce platforms leverage AI to provide personalized product recommendations, optimize pricing strategies, and manage inventory. Virtual shopping assistants and augmented reality try-ons are transforming the online shopping experience."
        }
      ],
      conclusion: "As we look toward the future, businesses that embrace AI will have a significant competitive advantage. The key is not just adopting AI technology, but integrating it thoughtfully into business processes to create real value for customers and stakeholders."
    },
    seo: {
      meta_title: "AI in Business: Future Trends & Opportunities 2024",
      meta_description: "Discover how AI is transforming modern business across healthcare, finance, and retail. Expert insights on future trends and implementation strategies.",
      canonical_url: "/blog/ai-future-modern-business",
      featured_image: "/images/blog/ai-business-future.jpg"
    },
    engagement: {
      views: 15420,
      likes: 892,
      shares: 234,
      comments_count: 67
    }
  },

  // News Article
  "sample/news-article": {
    id: "news_001",
    headline: "Global Climate Summit Reaches Historic Agreement on Carbon Reduction",
    subheadline: "195 countries commit to ambitious new targets for 2030",
    location: "Geneva, Switzerland",
    published_date: "2024-01-20T16:45:00Z",
    updated_date: "2024-01-20T18:30:00Z",
    urgency: "breaking",
    category: "Environment",
    tags: ["Climate Change", "Global Summit", "Carbon Reduction", "Environmental Policy", "Sustainability"],
    byline: {
      author: "Maria Rodriguez",
      title: "Environmental Correspondent",
      contact: "maria.rodriguez@newsnetwork.com"
    },
    lead_paragraph: "World leaders at the Global Climate Summit in Geneva have reached a groundbreaking agreement to reduce global carbon emissions by 55% by 2030, marking the most ambitious climate commitment in international history.",
    body: [
      {
        paragraph: "The agreement, signed by representatives from 195 countries, includes binding commitments for renewable energy adoption, forest conservation, and industrial transformation. The pact represents a significant acceleration from previous climate goals."
      },
      {
        paragraph: "\"This is a turning point for our planet,\" said Summit President Elena Kowalski. \"We're not just talking about change anymore—we're committing to concrete actions with measurable outcomes.\""
      },
      {
        paragraph: "Key provisions include a $2 trillion global fund for developing nations to transition to clean energy, mandatory carbon pricing in all major economies, and strict penalties for countries that fail to meet their targets."
      }
    ],
    quotes: [
      {
        text: "This agreement proves that when humanity faces an existential threat, we can come together and act decisively.",
        attribution: "Dr. James Mitchell, Climate Scientist at MIT",
        context: "Speaking at the summit's closing ceremony"
      }
    ],
    related_articles: [
      "Previous climate agreements and their outcomes",
      "Economic impact of carbon reduction policies",
      "Technology innovations driving clean energy"
    ],
    multimedia: {
      featured_image: "/images/news/climate-summit-2024.jpg",
      gallery: [
        "/images/news/summit-leaders.jpg",
        "/images/news/protest-outside.jpg",
        "/images/news/signing-ceremony.jpg"
      ],
      video: "/videos/news/summit-highlights.mp4"
    }
  },

  // Restaurant Menu
  "sample/restaurant-menu": {
    restaurant_info: {
      name: "Bella Vista Ristorante",
      cuisine_type: "Italian",
      location: "Downtown San Francisco",
      phone: "+1 (415) 555-0123",
      hours: {
        monday_friday: "11:30 AM - 10:00 PM",
        saturday_sunday: "10:00 AM - 11:00 PM"
      },
      description: "Authentic Italian cuisine in the heart of San Francisco, featuring fresh ingredients imported directly from Italy and traditional family recipes passed down through generations."
    },
    menu_sections: [
      {
        category: "Antipasti",
        description: "Traditional Italian appetizers to start your culinary journey",
        items: [
          {
            name: "Antipasto della Casa",
            description: "Chef's selection of cured meats, artisanal cheeses, olives, and roasted vegetables",
            price: 18.95,
            dietary_info: ["gluten_free_option"],
            spice_level: 0
          },
          {
            name: "Bruschetta Trio",
            description: "Three varieties: classic tomato basil, wild mushroom, and ricotta with honey",
            price: 14.95,
            dietary_info: ["vegetarian"],
            popular: true
          }
        ]
      },
      {
        category: "Pasta",
        description: "House-made pasta crafted daily with imported Italian flour",
        items: [
          {
            name: "Spaghetti Carbonara",
            description: "Classic Roman dish with pancetta, eggs, pecorino romano, and black pepper",
            price: 22.95,
            chef_special: true,
            preparation_time: "15-20 minutes"
          },
          {
            name: "Lobster Ravioli",
            description: "Hand-folded ravioli filled with Maine lobster in a light cream sauce with fresh herbs",
            price: 32.95,
            dietary_info: ["contains_shellfish"],
            wine_pairing: "Pinot Grigio"
          }
        ]
      },
      {
        category: "Desserts",
        description: "Traditional Italian sweets to complete your meal",
        items: [
          {
            name: "Tiramisu",
            description: "Classic Italian dessert with espresso-soaked ladyfingers, mascarpone, and cocoa",
            price: 9.95,
            house_made: true,
            contains_alcohol: true
          }
        ]
      }
    ],
    wine_list: {
      featured_wines: [
        {
          name: "Chianti Classico Riserva",
          region: "Tuscany, Italy",
          year: 2019,
          price_bottle: 65.00,
          price_glass: 12.00,
          tasting_notes: "Full-bodied with notes of cherry, leather, and herbs"
        }
      ]
    }
  },

  // Software Documentation
  "sample/api-documentation": {
    api_info: {
      name: "Ultimate Translator API",
      version: "2.1",
      description: "Comprehensive translation API supporting 50+ languages with advanced features for content management and localization",
      base_url: "https://api.ultimate-translator.com/v2",
      authentication: "API Key required",
      rate_limits: {
        free_tier: "1000 requests/day",
        pro_tier: "50000 requests/day",
        enterprise: "unlimited"
      }
    },
    endpoints: [
      {
        method: "POST",
        path: "/translate",
        summary: "Translate text or content",
        description: "Translate text, HTML, or JSON content from one language to another with support for context preservation and formatting",
        parameters: [
          {
            name: "source_text",
            type: "string",
            required: true,
            description: "The text content to translate"
          },
          {
            name: "source_language",
            type: "string",
            required: true,
            description: "Source language code (ISO 639-1)",
            example: "en"
          },
          {
            name: "target_language",
            type: "string",
            required: true,
            description: "Target language code (ISO 639-1)",
            example: "es"
          },
          {
            name: "content_type",
            type: "string",
            required: false,
            description: "Type of content being translated",
            options: ["text", "html", "json", "markdown"],
            default: "text"
          }
        ],
        response_example: {
          translated_text: "Hola mundo",
          source_language: "en",
          target_language: "es",
          confidence_score: 0.98,
          processing_time_ms: 245
        }
      }
    ],
    supported_languages: [
      { code: "en", name: "English", native_name: "English" },
      { code: "es", name: "Spanish", native_name: "Español" },
      { code: "fr", name: "French", native_name: "Français" },
      { code: "de", name: "German", native_name: "Deutsch" },
      { code: "it", name: "Italian", native_name: "Italiano" },
      { code: "pt", name: "Portuguese", native_name: "Português" }
    ],
    error_codes: {
      "400": "Bad Request - Invalid parameters",
      "401": "Unauthorized - Invalid API key",
      "429": "Rate Limit Exceeded",
      "500": "Internal Server Error"
    }
  },

  // Travel Guide
  "sample/travel-guide": {
    destination: {
      name: "Kyoto, Japan",
      country: "Japan",
      region: "Kansai",
      best_visit_time: "March-May, October-November",
      timezone: "JST (UTC+9)",
      currency: "Japanese Yen (¥)",
      language: "Japanese"
    },
    overview: "Ancient capital of Japan, Kyoto is a city where traditional culture and modern life harmoniously coexist. With over 2,000 temples, stunning gardens, and preserved historic districts, it offers an authentic glimpse into Japan's rich heritage.",
    top_attractions: [
      {
        name: "Fushimi Inari Shrine",
        type: "Religious Site",
        description: "Famous for thousands of vermillion torii gates creating tunnels up the mountainside",
        visit_duration: "2-3 hours",
        best_time: "Early morning or late afternoon",
        entrance_fee: "Free",
        must_see: true
      },
      {
        name: "Arashiyama Bamboo Grove",
        type: "Natural Wonder",
        description: "Ethereal bamboo forest creating a natural cathedral of towering green stalks",
        visit_duration: "1 hour",
        best_time: "Early morning for fewer crowds",
        entrance_fee: "Free",
        photography_tips: "Best light filtering through bamboo around 10 AM"
      }
    ],
    local_cuisine: {
      must_try_dishes: [
        {
          name: "Kaiseki",
          description: "Traditional multi-course Japanese dinner emphasizing seasonality and presentation",
          where_to_try: "Kikunoi (3 Michelin stars)",
          price_range: "¥15,000-30,000"
        },
        {
          name: "Tofu Cuisine",
          description: "Buddhist temple cuisine featuring various tofu preparations",
          where_to_try: "Arashiyama area temples",
          price_range: "¥2,000-5,000"
        }
      ]
    },
    practical_info: {
      transportation: {
        from_airport: "Kansai Express to Kyoto Station (75 minutes, ¥2,850)",
        local_transport: "City buses and subway system",
        recommended_pass: "Kyoto City Bus Pass (¥600/day)"
      },
      accommodation: {
        luxury: "The Ritz-Carlton Kyoto (¥80,000+/night)",
        mid_range: "Hotel Granvia Kyoto (¥15,000-25,000/night)",
        budget: "Guesthouse Kyoto (¥3,000-6,000/night)"
      }
    }
  }
};

// Define API routes with new validation system
router.get("/translation-filter", 
  validators.translationFilter, 
  asyncHandler(translationFilter)
);

router.get("/filter-by-url", 
  validators.translationFilter, 
  asyncHandler(filterByUrl)
);

router.get("/translate", 
  validators.pageTranslation, 
  asyncHandler(translatePage)
);

router.post("/update-translation",
  validators.updateTranslation,
  asyncHandler(updateTranslation)
);

router.put("/update-source", 
  validators.sourceChange, 
  asyncHandler(changeSource)
);

router.post("/string-translate", 
  validators.stringTranslation, 
  asyncHandler(translateString)
);

router.get("/translated-list", 
  asyncHandler(filterList)
);

router.get("/model-names", 
  asyncHandler(getModelNames)
);

router.delete("/delete-translation", 
  validators.deleteTranslation,
  asyncHandler(deleteTranslation)
);

router.get("/available-languages", 
  asyncHandler(availableLanguages)
);

router.put("/update-translation-url", 
  validators.translationUrlUpdate, 
  asyncHandler(updateTranslationUrl)
);

// Enhanced Sample Data Routes with Intelligent Processing
router.get("/sample/generate", 
  validators.pageTranslation, 
  asyncHandler(sampleController.generateSample)
);

router.get("/sample/types", 
  asyncHandler(sampleController.getSampleTypes)
);

router.get("/sample/quality", 
  asyncHandler(sampleController.getQualityMetrics)
);

// Translation Configuration Management Routes
router.get("/config/translation", 
  asyncHandler(translationConfigController.getConfiguration)
);

router.post("/config/translation/rules", 
  asyncHandler(translationConfigController.addRule)
);

router.get("/config/translation/analytics", 
  asyncHandler(translationConfigController.getAnalytics)
);

router.post("/config/translation/test", 
  asyncHandler(translationConfigController.testRules)
);

router.get("/config/translation/patterns", 
  asyncHandler(translationConfigController.getAutoDetectedPatterns)
);

router.put("/config/translation/auto-detection", 
  asyncHandler(translationConfigController.updateAutoDetectionSettings)
);

router.get("/config/translation/recommendations", 
  asyncHandler(translationConfigController.getRecommendedPatterns)
);

router.get("/getJsonContent", 
  validators.availableLanguages, // Reuse URL validation
  asyncHandler(async (req, res) => {
    const sourceUrl = req.query.source_url;
    const response = await axios.get(sourceUrl, {
      timeout: 30000, // 30 second timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
    });

    logger.info("JSON content fetched successfully", {
      sourceUrl,
      contentLength: JSON.stringify(response.data).length
    });

    res.json(response.data);
  })
);

// Sample Data Endpoints - Showcase Ultimate Translator Capabilities
router.get("/sample/:type", asyncHandler(async (req, res) => {
  const { type } = req.params;
  const sampleKey = `sample/${type}`;
  
  if (!sampleData[sampleKey]) {
    return res.status(404).json({
      error: "Sample data not found",
      available_samples: Object.keys(sampleData).map(key => key.replace('sample/', '')),
      message: "Use one of the available sample types to see comprehensive translation examples"
    });
  }

  logger.info("Sample data requested", { type, sampleKey });

  res.json({
    sample_type: type,
    description: getSampleDescription(type),
    data: sampleData[sampleKey],
    translation_features: getSampleFeatures(type),
    suggested_languages: ["es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    api_usage_example: {
      endpoint: "/api/v1/translate",
      method: "POST",
      payload: {
        source_url: `${req.protocol}://${req.get('host')}/api/v1/sample/${type}`,
        target_language: "es",
        model_name: type.replace('-', '_'),
        content_id: `${type}_demo_001`
      }
    }
  });
}));

// List all available sample data
router.get("/samples", asyncHandler(async (req, res) => {
  const samples = Object.keys(sampleData).map(key => {
    const type = key.replace('sample/', '');
    return {
      type,
      name: getSampleName(type),
      description: getSampleDescription(type),
      url: `/api/v1/sample/${type}`,
      features: getSampleFeatures(type),
      complexity: getSampleComplexity(type)
    };
  });

  res.json({
    total_samples: samples.length,
    samples,
    usage_note: "These samples demonstrate the full range of Ultimate Translator's capabilities across different content types and industries"
  });
}));

// Helper functions for sample data
function getSampleName(type) {
  const names = {
    'ecommerce-product': 'E-commerce Product Catalog',
    'blog-article': 'Blog Article & SEO Content',
    'news-article': 'News & Journalism',
    'restaurant-menu': 'Restaurant Menu & Hospitality',
    'api-documentation': 'Technical Documentation',
    'travel-guide': 'Travel & Tourism Guide'
  };
  return names[type] || type;
}

function getSampleDescription(type) {
  const descriptions = {
    'ecommerce-product': 'Comprehensive product data with pricing, specifications, reviews, and SEO metadata - perfect for international e-commerce',
    'blog-article': 'Rich blog content with author information, SEO optimization, and engagement metrics - ideal for content marketing',
    'news-article': 'Breaking news format with multimedia, quotes, and journalistic structure - great for media organizations',
    'restaurant-menu': 'Detailed menu with dietary information, wine pairings, and restaurant details - perfect for hospitality industry',
    'api-documentation': 'Technical documentation with endpoints, parameters, and examples - essential for developer resources',
    'travel-guide': 'Comprehensive travel information with attractions, cuisine, and practical tips - ideal for tourism websites'
  };
  return descriptions[type] || 'Sample data for translation testing';
}

function getSampleFeatures(type) {
  const features = {
    'ecommerce-product': ['Product descriptions', 'SEO metadata', 'Customer reviews', 'Technical specifications', 'Pricing information'],
    'blog-article': ['Long-form content', 'Author bios', 'SEO optimization', 'Social media integration', 'Content sections'],
    'news-article': ['Breaking news format', 'Quotes and attributions', 'Multimedia captions', 'Related articles', 'Urgency indicators'],
    'restaurant-menu': ['Menu items', 'Ingredient descriptions', 'Dietary restrictions', 'Wine pairings', 'Restaurant information'],
    'api-documentation': ['Technical specifications', 'Code examples', 'Parameter descriptions', 'Error messages', 'Usage instructions'],
    'travel-guide': ['Destination information', 'Cultural content', 'Practical advice', 'Local recommendations', 'Travel logistics']
  };
  return features[type] || ['General content translation'];
}

function getSampleComplexity(type) {
  const complexity = {
    'ecommerce-product': 'High',
    'blog-article': 'High',
    'news-article': 'Medium',
    'restaurant-menu': 'Medium',
    'api-documentation': 'High',
    'travel-guide': 'High'
  };
  return complexity[type] || 'Medium';
}

// Simple health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "ultimate-translator",
    sample_data_available: Object.keys(sampleData).length
  });
});

module.exports = router;
