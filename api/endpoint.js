const express = require("express");
const router = express.Router();

//Imports from Controller
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

//Import Validations

const {
  validateStringTranslation,
} = require("../validations/stringTranslatorValidate");
const {
  validateUpdateTranslation,
} = require("../validations/updateTranslationValidate");
const { validateSourceChange } = require("../validations/changeSourceValidate");
const {
  validateUpdateUrl,
} = require("../validations/validateUpdateTranslationUrl");

// Define API routes
router.get("/translation-filter", translationFilter);
router.get("/filter-by-url", filterByUrl);

router.get("/translate", translatePage);
router.post(
  "/update-translation",
  validateUpdateTranslation,
  updateTranslation
);

router.put("/update-source", validateSourceChange, changeSource);

router.post("/translate-text", validateStringTranslation, translateString);
router.get("/get-list", filterList);
router.get("/get-available-language", availableLanguages);

router.put("/update-translation-url", validateUpdateUrl, updateTranslationUrl);

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
