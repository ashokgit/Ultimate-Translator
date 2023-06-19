const TranslatedPage = require("../models/TranslatedPage");

class SourceCompareService {
  constructor(contentId, modelName) {
    this.contentId = contentId;
    this.modelName = modelName;
    this.changedPaths = [];
    this.sourceObj = null;
  }

  compare(sourceObj, updatedObj, currentPath = "") {
    for (const key in updatedObj) {
      const updatedValue = updatedObj[key];
      const sourceValue = sourceObj[key];
      const currentKeyPath = currentPath ? `${currentPath}.${key}` : key;

      if (typeof updatedValue === "object" && typeof sourceValue === "object") {
        if (Array.isArray(updatedValue) && Array.isArray(sourceValue)) {
          // Handle arrays
          if (updatedValue.length !== sourceValue.length) {
            this.changedPaths[currentKeyPath] = true;
            this.updateTranslationSourceChanged(currentKeyPath);
          } else {
            for (let i = 0; i < updatedValue.length; i++) {
              this.compare(
                sourceValue[i],
                updatedValue[i],
                `${currentKeyPath}[${i}]`
              );
            }
          }
        } else {
          // Handle nested objects
          if (key === "translations") {
            // Compare translations array separately
            this.compareTranslations(sourceValue, updatedValue, currentKeyPath);
          } else {
            this.compare(sourceValue, updatedValue, currentKeyPath);
          }
        }
      } else if (updatedValue !== sourceValue) {
        // Value is changed
        this.changedPaths[currentKeyPath] = true;
        this.updateTranslationSourceChanged(currentKeyPath);
      }
    }
  }

  compareTranslations(sourceArr, updatedArr, currentPath) {
    // Compare the translations array separately
    for (let i = 0; i < updatedArr.length; i++) {
      const updatedTranslation = updatedArr[i];
      const sourceTranslation = sourceArr[i];
      const translationPath = `${currentPath}[${i}]`;

      for (const lang in updatedTranslation) {
        const updatedLangObj = updatedTranslation[lang];
        const sourceLangObj = sourceTranslation[lang];

        if (
          typeof updatedLangObj === "object" &&
          typeof sourceLangObj === "object"
        ) {
          // Compare individual language objects
          for (const langKey in updatedLangObj) {
            const updatedLangValue = updatedLangObj[langKey];
            const sourceLangValue = sourceLangObj[langKey];
            const langKeyPath = `${translationPath}.${lang}.${langKey}`;

            if (updatedLangValue !== sourceLangValue) {
              // Value is changed in the language object
              this.changedPaths[langKeyPath] = true;
              this.updateTranslationSourceChanged(langKeyPath);
            }
          }
        } else {
          // Invalid translation structure, skip comparison
        }
      }
    }
  }

  async updateTranslations(updatedJson) {
    try {
      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: this.contentId,
        model_name: this.modelName,
      });

      if (!existingTranslatedPage) {
        throw new Error("Translation not found");
      }

      const translations = existingTranslatedPage.translations;

      for (const translation of translations) {
        const language = Object.keys(translation)[0];
        const translationData = translation[language];

        this.updateTranslationSourceChanged(translationData);
      }

      existingTranslatedPage.source_data = updatedJson;
      await existingTranslatedPage.save();
    } catch (error) {
      throw new Error(`Failed to update translations: ${error.message}`);
    }
  }

  updateTranslationSourceChanged(obj, currentPath = "") {
    for (const key in obj) {
      const value = obj[key];
      const currentKeyPath = currentPath ? `${currentPath}.${key}` : key;

      if (typeof value === "object" && !Array.isArray(value)) {
        this.updateTranslationSourceChanged(value, currentKeyPath);
      }
    }

    if (obj.hasOwnProperty("source_changed")) {
      obj.source_changed = true;
    }
  }

  async compareAndUpdate(sourceData, updatedJson) {
    this.changedPaths = []; // Reset the changed paths
    this.sourceObj = sourceData; // Store the source data for comparison

    this.compare(sourceData, updatedJson);
    await this.updateTranslations(updatedJson);
    console.log(
      "#################################################################################################################################"
    );
    console.log(this.changedPaths);
    return this.changedPaths;
  }
}

module.exports = SourceCompareService;
