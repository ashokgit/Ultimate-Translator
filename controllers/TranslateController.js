const TranslatedPage = require("../models/TranslatedPage");
const PageTranslationService = require("../services/PageTranslationService");

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

  translationFilter: async (req, res) => {
    try {
      const { language, content_id, model_name } = req.query;

      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id,
        model_name,
      });

      if (!existingTranslatedPage) {
        return res.status(404).json({ error: "Translations not found." });
      }

      const translations = existingTranslatedPage.translations;

      if (language) {
        const filteredTranslation = translations.find(
          (translation) => Object.keys(translation)[0] === language
        );

        if (!filteredTranslation) {
          return res.status(404).json({
            error: `Translations not found for language ${language}.`,
          });
        }

        return res.status(200).json(filteredTranslation);
      }

      res.status(200).json(existingTranslatedPage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = translateController;
