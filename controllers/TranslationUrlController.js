const TranslationUrlService = require("../services/TranslationUrlService");

const TranslationUrlController = {
  updateTranslationUrl: async (req, res) => {
    try {
      const { content_id, model_name, language, new_url } = req.body;

      const translationUpdateService = new TranslationUrlService();
      const result = await translationUpdateService.updateTranslationURL(
        content_id,
        model_name,
        language,
        new_url
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Translation URL updated successfully.",
        });
      } else {
        res.status(404).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = TranslationUrlController;
