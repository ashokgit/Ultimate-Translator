const { TranslatedPage } = require("../models/TranslatedPage");
const PageTranslationService = require("../services/PageTranslationService");
const compareService = require("../services/JsonCompareUpdateService");
const filterTranslation = require("../services/FilterTranslationService");
const getTranslationByUrl = require("../services/FilterByUrlService");
const logger = require("../utils/logger");
const { successResponse, NotFoundError, ValidationError } = require("../utils/errorHandler");

const translateController = {
  translatePage: async (req, res) => {
    const { model_name, language, source_url, content_id, customer_id } = req.query;

    const translationService = new PageTranslationService(
      model_name,
      language,
      customer_id || 'default'
    );
    const savedPage = await translationService.translatePage(
      source_url,
      content_id
    );
    
    logger.info("Page translation completed", {
      contentId: content_id,
      modelName: model_name,
      language: language,
      sourceUrl: source_url
    });
    
    const response = successResponse(
      savedPage,
      "Page translation completed successfully",
      {
        contentId: content_id,
        modelName: model_name,
        targetLanguage: language
      }
    );
    
    return res.status(200).json(response);
  },

  updateTranslation: async (req, res) => {
    const { content_id, model_name, language, updatedJson } = req.body;

    const existingTranslatedPage = await TranslatedPage.findOne({
      content_id: content_id,
      model_name: model_name,
    });

    if (!existingTranslatedPage) {
      throw new NotFoundError("Translation");
    }

    // Update the translation for the specified language
    const translations = existingTranslatedPage.translations;
    const existingTranslation =
      translations &&
      translations.find((translation) => {
        return Object.keys(translation)[0] === language;
      });

    if (!existingTranslation) {
      throw new NotFoundError(`Translation for language '${language}'`);
    }

    // Parse and validate JSON
    let parsedJson;
    try {
      parsedJson = JSON.parse(updatedJson);
    } catch (parseError) {
      throw new ValidationError("Invalid JSON format in updatedJson");
    }

    existingTranslation[language] = parsedJson;
    existingTranslatedPage.markModified("translations");
    await existingTranslatedPage.save();

    logger.info("Translation updated successfully", {
      contentId: content_id,
      modelName: model_name,
      language: language
    });

    const response = successResponse(
      existingTranslatedPage,
      "Translation updated successfully",
      {
        contentId: content_id,
        modelName: model_name,
        language: language,
        updatedAt: new Date().toISOString()
      }
    );

    return res.status(200).json(response);
  },

  translationFilter: async (req, res) => {
    const filterResponse = await filterTranslation(req);

    if (!filterResponse.success) {
      throw new NotFoundError("Translation");
    }

    const response = successResponse(
      filterResponse.data,
      "Translation filter results",
      {
        filters: req.query,
        resultCount: Array.isArray(filterResponse.data) ? filterResponse.data.length : 1,
        pagination: filterResponse.pagination
      }
    );

    res.status(200).json(response);
  },

  filterByUrl: async (req, res) => {
    const filterResponse = await getTranslationByUrl(req);

    if (!filterResponse.success) {
      throw new NotFoundError("Translation for the specified URL");
    }

    const response = successResponse(
      filterResponse.data,
      "URL-based translation filter results",
      {
        filters: req.query,
        resultCount: Array.isArray(filterResponse.data) ? filterResponse.data.length : 1
      }
    );

    res.status(200).json(response);
  },
};

module.exports = translateController;
