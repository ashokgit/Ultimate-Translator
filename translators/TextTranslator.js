require("dotenv").config();

const TranslationLog = require("../models/TranslationLog");
const GoogleTranslator = require("./GoogleTranslator");
const HuggingFaceTranslator = require("./HuggingFaceTranslator");
const OpenAITranslator = require("./OpenAITranslator");

class TextTranslator {
  constructor() {
    const defaultTranslator = process.env.DEFAULT_TRANSLATOR ?? "huggingface";

    switch (defaultTranslator) {
      case "google":
        this.translator = new GoogleTranslator();
        break;
      case "openai":
        this.translator = new OpenAITranslator();
        break;
      case "huggingface":
        this.translator = new HuggingFaceTranslator();
        break;
      default:
        throw new Error("Invalid default translator specified in environment");
    }
  }

  async translate(originalString, targetLanguage) {
    // Delegate translation to the underlying translator
    const translationLog = await TranslationLog.findOne({
      text: originalString,
      lang: targetLanguage,
    });

    if (translationLog) {
      return translationLog.translated_text;
    }

    return this.translator.translate(originalString, targetLanguage);
  }
}

module.exports = TextTranslator;
