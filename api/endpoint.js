const express = require("express");
const router = express.Router();
const {
  translatePage,
  translationFilter,
  updateTranslation,
  filterByUrl,
} = require("../controllers/TranslateController");
const { default: axios } = require("axios");
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

// Define API routes
router.get("/translation-filter", translationFilter);
router.get("/filter-by-url", filterByUrl);

router.get("/translate", translatePage);
router.post("/update-translation", updateTranslation);

router.put("/update-source", changeSource);

router.post("/translate-text", translateString);
router.get("/get-list", filterList);
router.get("/get-available-language", availableLanguages);

router.put("/update-translation-url", updateTranslationUrl);

router.get("/getJsonContent", async (req, res) => {
  try {
    const sourceUrl = req.query.sourceUrl;
    const response = await axios.get(sourceUrl);

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

module.exports = router;
