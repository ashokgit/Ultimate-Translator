const { TranslatedPage } = require("../models/TranslatedPage");

class SourceCompareService {
  constructor(contentId, modelName) {
    this.contentId = contentId;
    this.modelName = modelName;
    this.changedPaths = {};
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
          this.compare(sourceValue, updatedValue, currentKeyPath);
        }
      } else if (updatedValue !== sourceValue) {
        // Value is changed
        this.changedPaths[currentKeyPath] = true;
        console.log(
          `Value changed at ${currentKeyPath}:`,
          `Source: ${sourceValue}`,
          `Updated: ${updatedValue}`
        );
      }
    }
  }

  async updateTranslations() {
    try {
      let changedPaths = this.changedPaths;
      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: this.contentId,
        model_name: this.modelName,
      });

      if (!existingTranslatedPage) {
        throw new Error("Translation not found");
      }

      const translations = existingTranslatedPage.translations;

      // Convert changedPaths object to an array
      const changedPathsArray = Object.keys(changedPaths);

      // Iterate over each translation
      for (const translation of translations) {
        const language = Object.keys(translation)[0];
        const translationData = translation[language];

        // Iterate over each changed path
        for (const changedPath of changedPathsArray) {
          const pathParts = changedPath.split(".");
          let obj = translationData;

          // Traverse the translation data to reach the parent object of the changed path
          for (const key of pathParts.slice(0, -1)) {
            obj = obj[key];
          }

          console.log(`Language: ${language}`);
          console.log(`Changed Path: ${changedPath}`);
          console.log("Parent Object:", obj);
          console.log();

          // obj will now be the parent object of the changed path
          // Update the source_changed property to true in the parent object
          obj.source_changed = true;
        }
      }

      // Update the translations in the database
      const updatedTranslatedPage = await TranslatedPage.findOneAndUpdate(
        {
          content_id: this.contentId,
          model_name: this.modelName,
        },
        { translations: translations },
        { new: true }
      );

      console.log("Updated TranslatedPage:", updatedTranslatedPage);
    } catch (error) {
      throw new Error(`Failed to update translations: ${error.message}`);
    }
  }

  async compareAndUpdate(sourceData, updatedJson) {
    this.sourceObj = sourceData;
    this.compare(sourceData, updatedJson);
    this.updateTranslations();
    console.log("Changed Paths:");
    console.log(this.changedPaths);
    return this.changedPaths;
  }
}

module.exports = SourceCompareService;
