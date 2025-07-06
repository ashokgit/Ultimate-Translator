const { TranslatedPage } = require("../models/TranslatedPage");
const TextTranslator = require("../translators/TextTranslator");
const getTranslationConfig = require("../services/TranslationConfigService");

class SourceCompareService {
  constructor(contentId, modelName, customerId = "default") {
    this.contentId = contentId;
    this.modelName = modelName;
    this.customerId = customerId;
    this.changedPaths = {};
    this.sourceObj = null;
    this.translator = new TextTranslator(modelName, customerId);
    this.configService = getTranslationConfig();
  }

  compare(sourceObj, updatedObj, currentPath = "") {
    for (const key in updatedObj) {
      if (!Object.prototype.hasOwnProperty.call(updatedObj, key)) continue;

      const updatedValue = updatedObj[key];
      const sourceValue = sourceObj ? sourceObj[key] : undefined;
      const currentKeyPath = currentPath ? `${currentPath}.${key}` : key;

      if (
        typeof updatedValue === "object" &&
        updatedValue !== null &&
        !Array.isArray(updatedValue)
      ) {
        this.compare(
          sourceValue,
          updatedValue,
          currentKeyPath
        );
      } else if (updatedValue !== sourceValue) {
        this.changedPaths[currentKeyPath] = updatedValue;
      }
    }
  }

  async updateTranslations() {
    if (Object.keys(this.changedPaths).length === 0) {
      return;
    }

    const existingTranslatedPage = await TranslatedPage.findOne({
      content_id: this.contentId,
      model_name: this.modelName,
    });

    if (!existingTranslatedPage) {
      throw new Error("Translation not found");
    }

    const { translations } = existingTranslatedPage;

    for (const translation of translations) {
      const language = Object.keys(translation)[0];
      const translationData = translation[language];

      for (const changedPath in this.changedPaths) {
        const newValue = this.changedPaths[changedPath];

        const shouldTranslate = await this.configService.shouldTranslateKey(
          changedPath,
          newValue,
          this.customerId
        );

        if (shouldTranslate) {
          const translatedValue = await this.translator.translate(
            String(newValue),
            language
          );
          this.setValueByPath(translationData, changedPath, translatedValue);
        } else {
          this.setValueByPath(translationData, changedPath, newValue);
        }
      }
    }

    existingTranslatedPage.markModified("translations");
    await existingTranslatedPage.save();
  }

  setValueByPath(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  async compareAndUpdate(sourceData, updatedJson) {
    this.sourceObj = sourceData;
    this.compare(sourceData, updatedJson);
    await this.updateTranslations();
    console.log("Changed Paths:");
    console.log(this.changedPaths);
    return this.changedPaths;
  }
}

module.exports = SourceCompareService;
