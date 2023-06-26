const TranslationLog = require("../models/TranslationLog");
const TextTranslator = require("../translators/TextTranslator");

const StringTranslatorController = {
  translateString: async (req, res) => {
    try {
      const { language, text } = req.body;

      const stringTranslateService = new TextTranslator();
      const translated_text = await stringTranslateService.translate(
        text,
        language
      );
      // Save Translation Log
      const newTranslationLog = new TranslationLog({
        text: text,
        lang: language,
        translated_text: translated_text,
      });

      await newTranslationLog.save();

      return res.status(200).json(translated_text);
    } catch (error) {
      console.error("Error translating page:", error);
      res.status(500).json({ error: error });
    }
  },
};

module.exports = StringTranslatorController;
