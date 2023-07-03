const TranslatedPage = require("../models/TranslatedPage");

class TranslationUrlService {
  async updateTranslationURL(content_id, model_name, language, new_url) {
    try {
      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id,
        model_name,
      });

      if (!existingTranslatedPage) {
        return { success: false, error: "Translations not found." };
      }

      const translations = existingTranslatedPage.translations;

      const languageObjectIndex = translations.findIndex(
        (translation) => Object.keys(translation)[0] === language
      );

      if (languageObjectIndex === -1) {
        return {
          success: false,
          error: `Translation not found for language ${language}.`,
        };
      }

      const languageObject = translations[languageObjectIndex][language];

      const existingURL = languageObject.url;

      if (existingURL) {
        if (!languageObject.old_urls.includes(existingURL)) {
          languageObject.old_urls.push(existingURL);
        }
      }

      languageObject.url = new_url;

      // Mark the 'translations' field as modified
      existingTranslatedPage.markModified("translations");

      await existingTranslatedPage.save();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = TranslationUrlService;
