const TranslationLog = require("../models/TranslationLog");
const TextTranslator = require("../translators/TextTranslator");
const logger = require("../utils/logger");
const { successResponse, TranslationError } = require("../utils/errorHandler");

const StringTranslatorController = {
  translateString: async (req, res) => {
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

    const response = successResponse(
      { 
        original_text: text,
        translated_text,
        source_language: 'auto-detected',
        target_language: language,
        provider: stringTranslateService.translatorType 
      },
      "Translation completed successfully"
    );

    return res.status(200).json(response);
  },
};

module.exports = StringTranslatorController;
