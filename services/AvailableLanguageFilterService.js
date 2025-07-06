const { TranslatedPage } = require("../models/TranslatedPage");

async function getAvailableLanguages(req) {
  try {
    const { content_id, source_url } = req.query;

    const existingTranslatedPage = await TranslatedPage.findOne({
      content_id,
      source_url,
    });

    if (!existingTranslatedPage) {
      return { success: false, error: "Translations not found." };
    }

    const translations = existingTranslatedPage.translations;
    const filteredTranslations = translations.map((translation) => {
      const language = Object.keys(translation)[0];
      const url = translation[language]?.url || "";
      return { language, url };
    });

    return { success: true, data: filteredTranslations };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = getAvailableLanguages;
