const TranslatedPage = require("../models/TranslatedPage");
const filterAndGroup = require("../services/FilterAndGroupTranslationService");

const TranslatedListController = {
  filterList: async (req, res) => {
    const filterResponse = await filterAndGroup(req);

    if (filterResponse.success) {
      res.status(200).json(filterResponse.data);
    } else {
      res.status(404).json({ error: filterResponse.error });
    }
  },

  getModelNames: async (req, res) => {
    try {
      // Get all unique model names from the database
      const modelNames = await TranslatedPage.distinct("model_name");
      
      // Sort alphabetically for better UX
      const sortedModelNames = modelNames.sort();
      
      res.status(200).json({
        success: true,
        data: sortedModelNames,
        total: sortedModelNames.length
      });
    } catch (error) {
      console.error("Error fetching model names:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch model names" 
      });
    }
  },

  deleteTranslation: async (req, res) => {
    try {
      const { content_id, model_name, language } = req.body;

      // Validate required fields
      if (!content_id || !model_name || !language) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: content_id, model_name, language"
        });
      }

      // Find the translated page
      const translatedPage = await TranslatedPage.findOne({
        content_id,
        model_name
      });

      if (!translatedPage) {
        return res.status(404).json({
          success: false,
          error: "Translation not found"
        });
      }

      // Find the translation for the specific language
      const languageIndex = translatedPage.translations.findIndex(
        translation => Object.keys(translation)[0] === language
      );

      if (languageIndex === -1) {
        return res.status(404).json({
          success: false,
          error: `Translation not found for language: ${language}`
        });
      }

      // Remove the language translation
      translatedPage.translations.splice(languageIndex, 1);

      // If no translations left, delete the entire document
      if (translatedPage.translations.length === 0) {
        await TranslatedPage.findByIdAndDelete(translatedPage._id);
        return res.status(200).json({
          success: true,
          message: "Translation deleted successfully. Document removed as no translations remain.",
          deleted_entire_document: true
        });
      } else {
        // Save the updated document
        translatedPage.markModified("translations");
        await translatedPage.save();
        
        return res.status(200).json({
          success: true,
          message: "Translation deleted successfully",
          remaining_translations: translatedPage.translations.length
        });
      }

    } catch (error) {
      console.error("Error deleting translation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete translation"
      });
    }
  }
};

module.exports = TranslatedListController;
