const TranslatedPage = require("../models/TranslatedPage");
const JsonFetcherService = require("./JsonFetcherService");
const TranslationGeneratorService = require("./TranslationGeneratorService");

class PageTranslationService {
  constructor(modelName, language) {
    this.modelName = modelName;
    this.language = language;
    this.jsonFetcher = new JsonFetcherService();
    this.translationGenerator = new TranslationGeneratorService();
  }

  async translatePage(sourceUrl, contentId) {
    try {
      const jsonData = await this.jsonFetcher.fetchData(sourceUrl);
      const translations = await this.translationGenerator.generateTranslations(
        jsonData,
        this.language
      );

      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: contentId,
        model_name: this.modelName,
      });

      if (existingTranslatedPage) {
        const existingTranslations = existingTranslatedPage.translations;

        // Check if the language already exists in the translations array
        const languageExists = existingTranslations.some((translation) => {
          return Object.keys(translation)[0] === this.language;
        });

        if (!languageExists) {
          // Add the new translation to the existing translations array
          existingTranslations.push({
            [this.language]: translations[this.language],
          });
          existingTranslatedPage.markModified("translations");
          await existingTranslatedPage.save();

          return existingTranslatedPage;
        }

        // Language already exists, no need to save again
        return existingTranslatedPage;
      }

      // Create a new translated page document
      const translatedPage = new TranslatedPage({
        content_id: contentId,
        source_url: sourceUrl,
        model_name: this.modelName,
        source_data: jsonData,
        translations: [{ [this.language]: translations[this.language] }],
      });

      await translatedPage.save();
      return translatedPage;
    } catch (error) {
      console.error(`Failed to translate page: ${error.message}`);
      throw new Error("Failed to translate page");
    }
  }
}

module.exports = PageTranslationService;
