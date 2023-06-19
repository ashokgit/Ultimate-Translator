const TranslatedPage = require("../models/TranslatedPage");

async function filterTranslation(req) {
  try {
    const { language, content_id, model_name } = req.query;

    const existingTranslatedPage = await TranslatedPage.findOne({
      content_id,
      model_name,
    });

    if (!existingTranslatedPage) {
      return { success: false, error: "Translations not found." };
    }

    const translations = existingTranslatedPage.translations;

    if (language) {
      const filteredTranslation = translations.find(
        (translation) => Object.keys(translation)[0] === language
      );

      if (!filteredTranslation) {
        return {
          success: false,
          error: `Translations not found for language ${language}.`,
        };
      }

      return { success: true, data: filteredTranslation };
    }

    return { success: true, data: existingTranslatedPage };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = filterTranslation;
