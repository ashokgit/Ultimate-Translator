const TranslationLog = require("../models/TranslationLog");
const TextTranslator = require("../translators/TextTranslator");
const logger = require("../utils/logger");
const { successResponse, TranslationError } = require("../utils/errorHandler");

/**
 * @swagger
 * tags:
 *   name: Translation
 *   description: Translation related endpoints
 */

/**
 * @swagger
 * /api/v1/string-translate:
 *   post:
 *     summary: Translate a string of text
 *     tags: [Translation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text to translate.
 *                 example: "Hello, world!"
 *               language:
 *                 type: string
 *                 description: The target language code.
 *                 example: "fr"
 *     responses:
 *       '200':
 *         description: Successful translation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     original_text:
 *                       type: string
 *                     translated_text:
 *                       type: string
 *                     source_language:
 *                       type: string
 *                     target_language:
 *                       type: string
 *                     provider:
 *                       type: string
 *       '400':
 *         description: Bad request due to invalid parameters.
 *       '500':
 *         description: Internal server error.
 */
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
