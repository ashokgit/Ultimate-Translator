const TranslationLog = require("../models/TranslationLog");
const TextTranslator = require("../translators/TextTranslator");
const { isURL, makeSlug } = require("../helpers/stringHelpers");

class TranslationGeneratorService {
  async generateTranslations(data, language) {
    const translations = {};

    const traverse = async (node, path) => {
      if (typeof node === "object" && node !== null) {
        if (Array.isArray(node)) {
          const translatedArray = [];
          for (let index = 0; index < node.length; index++) {
            const currentPath = `${path}[${index}]`;
            const translatedItem = await traverse(node[index], currentPath);
            translatedArray.push(translatedItem);
          }
          return translatedArray;
        } else {
          const translatedObject = {};
          for (const key in node) {
            const value = node[key];
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === "object" && value !== null) {
              const translatedValue = await traverse(value, currentPath);
              translatedObject[key] = translatedValue;
            } else {
              translatedObject[key] = value;
            }
          }

          await translatePerfectStrings(translatedObject, language);

          return translatedObject;
        }
      } else {
        return node;
      }
    };

    const translatePerfectStrings = async (obj, language) => {
      if (typeof obj === "object" && obj !== null) {
        let hasPerfectString = false;

        for (const key in obj) {
          const value = obj[key];

          if (
            typeof value === "string" &&
            !/^\d+$/.test(value) &&
            !isURL(value) &&
            value.length <= 100
          ) {
            hasPerfectString = true;

            const existingTranslation = await TranslationLog.findOne({
              text: value,
              lang: language,
            });

            if (existingTranslation) {
              obj[key] = existingTranslation.translated_text;
            } else {
              const translatedValue = await this.translate(value, language);
              obj[key] = translatedValue;

              // Save Translation Log
              const newTranslationLog = new TranslationLog({
                text: value,
                lang: language,
                translated_text: translatedValue,
              });

              await newTranslationLog.save();
              // Save Translation Log
            }
          }
        }

        if (hasPerfectString) {
          obj.verified = false;
          obj.verified_by = "";
          obj.source_changed = false;
          obj.auto_verify = false;
        }
      }

      const title = obj?.description
        ? await this.translate(obj.description, language)
        : "";
      obj.url = makeSlug(title);
      obj.old_urls = [];
    };

    const translatedData = await traverse(data, "");

    translations[language] = translatedData;

    return translations;
  }

  async translate(text, targetLanguage) {
    const translator = new TextTranslator();
    let translatedText = translator.translate(text, targetLanguage);
    return translatedText;
  }
}
module.exports = TranslationGeneratorService;
