const { TranslatedPage } = require("../models/TranslatedPage");
const PageTranslationService = require("../services/PageTranslationService");
const TranslationGeneratorService = require("../services/TranslationGeneratorService");
const compareService = require("../services/JsonCompareUpdateService");
const filterTranslation = require("../services/FilterTranslationService");
const getTranslationByUrl = require("../services/FilterByUrlService");
const logger = require("../utils/logger");
const { successResponse, NotFoundError, ValidationError } = require("../utils/errorHandler");

/**
 * @swagger
 * /api/v1/translate:
 *   get:
 *     summary: Translate a page from a source URL
 *     tags: [Translation]
 *     parameters:
 *       - in: query
 *         name: model_name
 *         schema:
 *           type: string
 *         required: true
 *         description: The name of the translation model to use.
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         required: true
 *         description: The target language code.
 *       - in: query
 *         name: source_url
 *         schema:
 *           type: string
 *         required: true
 *         description: The URL of the source content to translate.
 *       - in: query
 *         name: content_id
 *         schema:
 *           type: string
 *         description: A unique identifier for the content.
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *         description: The ID of the customer.
 *     responses:
 *       '200':
 *         description: Successful page translation.
 *       '400':
 *         description: Bad request due to invalid parameters.
 *       '500':
 *         description: Internal server error.
 */
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

  /**
   * @swagger
   * /api/v1/update-translation:
   *   post:
   *     summary: Update an existing translation
   *     tags: [Translation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content_id:
   *                 type: string
   *                 description: The unique identifier for the content.
   *               model_name:
   *                 type: string
   *                 description: The name of the translation model.
   *               language:
   *                 type: string
   *                 description: The language code of the translation to update.
   *               updatedJson:
   *                 type: string
   *                 description: A JSON string containing the updated translation.
   *     responses:
   *       '200':
   *         description: Translation updated successfully.
   *       '400':
   *         description: Bad request due to invalid parameters.
   *       '404':
   *         description: Translation not found.
   *       '500':
   *         description: Internal server error.
   */
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

  /**
   * @swagger
   * /api/v1/translation-filter:
   *   get:
   *     summary: Filter translations based on query parameters
   *     tags: [Translation]
   *     parameters:
   *       - in: query
   *         name: any
   *         schema:
   *           type: string
   *         description: This endpoint accepts various query parameters for filtering.
   *     responses:
   *       '200':
   *         description: A list of filtered translations.
   *       '404':
   *         description: No translations found for the given filter.
   *       '500':
   *         description: Internal server error.
   */
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

  /**
   * @swagger
   * /api/v1/filter-by-url:
   *   get:
   *     summary: Filter translations by source URL
   *     tags: [Translation]
   *     parameters:
   *       - in: query
   *         name: source_url
   *         schema:
   *           type: string
   *         required: true
   *         description: The source URL to filter translations by.
   *     responses:
   *       '200':
   *         description: A list of translations for the given URL.
   *       '404':
   *         description: No translations found for the specified URL.
   *       '500':
   *         description: Internal server error.
   */
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

  /**
   * @swagger
   * /api/v1/retranslate-field:
   *   post:
   *     summary: Re-translate a specific field
   *     tags: [Translation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content_id:
   *                 type: string
   *                 description: The unique identifier for the content.
   *               model_name:
   *                 type: string
   *                 description: The name of the translation model.
   *               language:
   *                 type: string
   *                 description: The language code of the translation.
   *               field_path:
   *                 type: string
   *                 description: The path to the field to re-translate.
   *               original_text:
   *                 type: string
   *                 description: The original text to re-translate.
   *               customer_id:
   *                 type: string
   *                 description: The customer ID for translation preferences.
   *     responses:
   *       '200':
   *         description: Field re-translated successfully.
   *       '400':
   *         description: Bad request due to invalid parameters.
   *       '404':
   *         description: Translation not found.
   *       '500':
   *         description: Internal server error.
   */
  retranslateField: async (req, res) => {
    const { content_id, model_name, language, field_path, original_text, customer_id } = req.body;

    // Validate required parameters
    if (!content_id || !model_name || !language || !field_path || !original_text) {
      throw new ValidationError("Missing required fields: content_id, model_name, language, field_path, original_text");
    }

    try {
      // Find the existing translation document
      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: content_id,
        model_name: model_name,
      });

      if (!existingTranslatedPage) {
        throw new NotFoundError("Translation");
      }

      // Find the translation for the specified language
      const translations = existingTranslatedPage.translations;
      const existingTranslation = translations.find((translation) => {
        return Object.keys(translation)[0] === language;
      });

      if (!existingTranslation) {
        throw new NotFoundError(`Translation for language '${language}'`);
      }

      // Initialize translation generator service
      const translationGenerator = new TranslationGeneratorService(customer_id || 'default');

      // Re-translate the specific field
      const newTranslatedText = await translationGenerator.translateValue(
        original_text,
        language,
        field_path.split('.').pop(), // Use the last part as the key
        field_path
      );

      // Update the specific field in the translation
      const translationData = existingTranslation[language];
      const pathParts = field_path.split('.');
      let current = translationData;
      
      // Navigate to the parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (part.includes('[') && part.includes(']')) {
          // Handle array indices
          const arrayName = part.split('[')[0];
          const index = parseInt(part.split('[')[1].split(']')[0]);
          current = current[arrayName][index];
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }

      // Set the new translated value
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.includes('[') && lastPart.includes(']')) {
        const arrayName = lastPart.split('[')[0];
        const index = parseInt(lastPart.split('[')[1].split(']')[0]);
        current[arrayName][index] = newTranslatedText;
      } else {
        current[lastPart] = newTranslatedText;
      }

      // Save the updated translation
      existingTranslatedPage.markModified("translations");
      await existingTranslatedPage.save();

      logger.info("Field re-translated successfully", {
        contentId: content_id,
        modelName: model_name,
        language: language,
        fieldPath: field_path,
        originalText: original_text.substring(0, 50) + '...',
        newTranslatedText: newTranslatedText.substring(0, 50) + '...'
      });

      const response = successResponse(
        {
          field_path: field_path,
          original_text: original_text,
          new_translated_text: newTranslatedText,
          updated_at: new Date().toISOString()
        },
        "Field re-translated successfully",
        {
          contentId: content_id,
          modelName: model_name,
          language: language,
          fieldPath: field_path
        }
      );

      return res.status(200).json(response);

    } catch (error) {
      logger.error("Field re-translation failed", {
        contentId: content_id,
        modelName: model_name,
        language: language,
        fieldPath: field_path,
        error: error.message
      });
      throw error;
    }
  },
};

module.exports = translateController;
