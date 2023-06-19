const TranslatedPage = require("../models/TranslatedPage");
const PageTranslationService = require("../services/PageTranslationService");
const compareService = require("../services/JsonCompareUpdateService");
const filterTranslation = require("../services/FilterTranslationService");

const translateController = {
  translatePage: async (req, res) => {
    try {
      const { model_name, language, source_url, content_id } = req.query;

      const translationService = new PageTranslationService(
        model_name,
        language
      );
      const savedPage = await translationService.translatePage(
        source_url,
        content_id
      );
      console.log(savedPage);
      return res.status(200).json(savedPage);
    } catch (error) {
      console.error("Error translating page:", error);
      res.status(500).json({ error: error.message });
    }
  },

  updateTranslation: async (req, res) => {
    try {
      const { content_id, model_name, language, updatedJson } = req.body;

      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: content_id,
        model_name: model_name,
      });

      if (!existingTranslatedPage) {
        return res
          .status(404)
          .json({ success: false, error: "Translation not found" });
      }

      // Update the translation for the specified language
      const translations = existingTranslatedPage.translations;
      const existingTranslation = translations.find((translation) => {
        return Object.keys(translation)[0] === language;
      });

      if (!existingTranslation) {
        return res
          .status(404)
          .json({ success: false, error: "Language translation not found" });
      }

      existingTranslation[language] = JSON.parse(updatedJson);
      existingTranslatedPage.markModified("translations");
      await existingTranslatedPage.save();

      return res
        .status(200)
        .json({ success: true, data: existingTranslatedPage });
    } catch (error) {
      console.error(`Failed to update translation: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update translation" });
    }
  },

  translationFilter: async (req, res) => {
    const filterResponse = await filterTranslation(req);

    if (filterResponse.success) {
      res.status(200).json(filterResponse.data);
    } else {
      res.status(404).json({ error: filterResponse.error });
    }
  },
};

module.exports = translateController;
