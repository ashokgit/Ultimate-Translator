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
const { filterList } = require("../controllers/TranslatedListController");
const filterAndGroup = require("../services/FilterAndGroupTranslationService");
const {
  availableLanguages,
} = require("../controllers/AvailableLanguageController");
const {
  updateTranslationUrl,
} = require("../controllers/TranslationUrlController");

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

router.get("/available-languages", 
  asyncHandler(availableLanguages)
);

router.put("/update-translation-url", 
  validators.translationUrlUpdate, 
  asyncHandler(updateTranslationUrl)
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

// Simple health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "ultimate-translator"
  });
});

module.exports = router;
