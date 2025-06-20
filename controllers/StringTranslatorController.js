const TranslationLog = require("../models/TranslationLog");
const TextTranslator = require("../translators/TextTranslator");
const logger = require("../utils/logger");

const StringTranslatorController = {
  translateString: async (req, res) => {
    try {
      const { language, text } = req.body;

      const stringTranslateService = new TextTranslator();
      const translated_text = await stringTranslateService.translate(
        text,
        language
      );

      logger.info("String translation completed", {
        textLength: text.length,
        targetLanguage: language,
        resultLength: translated_text.length
      });

      return res.status(200).json({ translated_text });
    } catch (error) {
      logger.error("Error translating string", {
        textLength: text?.length || 0,
        targetLanguage: language,
        error: error.message
      });
      
      res.status(500).json({ error: "Translation failed. Please try again later." });
    }
  },
};

module.exports = StringTranslatorController;
