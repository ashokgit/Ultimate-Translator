const { TranslatedPage } = require("../models/TranslatedPage");
const TextTranslator = require("../translators/TextTranslator");
const TranslationConfigService = require("../services/TranslationConfigService");

class SourceCompareService {
  constructor(contentId, modelName, customerId = "default") {
    this.contentId = contentId;
    this.modelName = modelName;
    this.customerId = customerId;
    this.changedPaths = {};
    this.sourceObj = null;
    this.translator = new TextTranslator(modelName, customerId);
    this.configService = new TranslationConfigService();
  }

  compare(sourceObj, updatedObj, currentPath = "") {
    for (const key in updatedObj) {
      if (!Object.prototype.hasOwnProperty.call(updatedObj, key)) continue;

      const updatedValue = updatedObj[key];
      const sourceValue = sourceObj ? sourceObj[key] : undefined;
      const currentKeyPath = currentPath ? `${currentPath}.${key}` : key;

      if (Array.isArray(updatedValue)) {
        // For arrays, compare each element
        if (!Array.isArray(sourceValue) || 
            JSON.stringify(updatedValue) !== JSON.stringify(sourceValue)) {
          // If array content is different, mark entire array for translation
          this.changedPaths[currentKeyPath] = updatedValue;
          
          // Also compare objects within the array
          updatedValue.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              const arrayItemPath = `${currentKeyPath}[${index}]`;
              const sourceItem = Array.isArray(sourceValue) ? sourceValue[index] : undefined;
              this.compare(sourceItem, item, arrayItemPath);
            }
          });
        }
      } else if (
        typeof updatedValue === "object" &&
        updatedValue !== null
      ) {
        // For objects, recursively compare
        this.compare(
          sourceValue || {},
          updatedValue,
          currentKeyPath
        );
      } else if (updatedValue !== sourceValue) {
        // For primitive values, mark for translation if different
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
    const updatedFields = new Set(); // Track which fields were updated

    for (const translation of translations) {
      const language = Object.keys(translation)[0];
      const translationData = translation[language];

      for (const changedPath in this.changedPaths) {
        const newValue = this.changedPaths[changedPath];
        const shouldTranslate = await this.configService.shouldTranslateKey(
          changedPath.split('.').pop().replace(/\[\d+\]$/, ''), // Get the actual key name
          newValue,
          this.customerId
        );

        if (shouldTranslate) {
          if (Array.isArray(newValue)) {
            // Handle array translation
            const translatedArray = await Promise.all(
              newValue.map(async (item, index) => {
                if (typeof item === 'object' && item !== null) {
                  // For objects in arrays, translate each field
                  const translatedObj = {};
                  for (const [key, value] of Object.entries(item)) {
                    if (typeof value === 'string' || typeof value === 'number') {
                      translatedObj[key] = await this.translator.translate(String(value), language);
                      // Track the field path for array items
                      updatedFields.add(`${changedPath}[${index}].${key}`);
                    } else {
                      translatedObj[key] = value;
                    }
                  }
                  return translatedObj;
                } else {
                  // Translate primitive values
                  updatedFields.add(`${changedPath}[${index}]`);
                  return await this.translator.translate(String(item), language);
                }
              })
            );
            this.setValueByPath(translationData, changedPath, translatedArray);
          } else if (typeof newValue === 'object' && newValue !== null) {
            // For objects, translate each field
            const translatedObj = {};
            for (const [key, value] of Object.entries(newValue)) {
              if (typeof value === 'string' || typeof value === 'number') {
                translatedObj[key] = await this.translator.translate(String(value), language);
                updatedFields.add(`${changedPath}.${key}`);
              } else {
                translatedObj[key] = value;
              }
            }
            this.setValueByPath(translationData, changedPath, translatedObj);
          } else {
            // For primitive values, translate directly
            const translatedValue = await this.translator.translate(
              String(newValue),
              language
            );
            updatedFields.add(changedPath);
            this.setValueByPath(translationData, changedPath, translatedValue);
          }
        } else {
          // If not translatable, preserve the original value
          this.setValueByPath(translationData, changedPath, newValue);
        }
      }

      // Reset verification status for updated fields
      if (!existingTranslatedPage.field_approval_status) {
        existingTranslatedPage.field_approval_status = {};
      }
      if (!existingTranslatedPage.field_approval_status[language]) {
        existingTranslatedPage.field_approval_status[language] = {};
      }

      for (const fieldPath of updatedFields) {
        existingTranslatedPage.field_approval_status[language][fieldPath] = {
          status: 'pending',
          reviewed_at: new Date(),
          reviewed_by: 'system'
        };
      }
    }

    existingTranslatedPage.markModified("translations");
    existingTranslatedPage.markModified("field_approval_status");
    await existingTranslatedPage.save();

    return {
      changedPaths: this.changedPaths,
      updatedFields: Array.from(updatedFields)
    };
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
    try {
      // Initialize the config service
      await this.configService.initialize();
      
      this.sourceObj = sourceData;
      this.compare(sourceData, updatedJson);
      await this.updateTranslations();
      
      console.log("Changed Paths:", this.changedPaths);
      return this.changedPaths;
    } catch (error) {
      console.error("Error in compareAndUpdate:", error);
      throw error; // Re-throw to be handled by the controller
    }
  }
}

module.exports = SourceCompareService;
