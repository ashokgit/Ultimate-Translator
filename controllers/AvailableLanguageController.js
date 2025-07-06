const {
  getAvailableLanguages,
} = require("../services/AvailableLanguageFilterService");
const supportedLanguages = require("../config/languages");

/**
 * @swagger
 * tags:
 *   name: Language Management
 *   description: Endpoints for managing available languages.
 */
const AvailableLanguageController = {
  /**
   * @swagger
   * /api/v1/get-available-language:
   *   get:
   *     summary: Get available languages for a specific translation
   *     tags: [Language Management]
   *     parameters:
   *       - in: query
   *         name: content_id
   *         schema:
   *           type: string
   *         required: true
   *       - in: query
   *         name: source_url
   *         schema:
   *           type: string
   *         required: true
   *     responses:
   *       '200':
   *         description: A list of available languages.
   *       '404':
   *         description: Translations not found.
   */
  getAvailableLanguages: async (req, res) => {
    const result = await getAvailableLanguages(req);
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  },

  /**
   * @swagger
   * /api/v1/supported-languages:
   *   get:
   *     summary: Get a list of all supported languages
   *     tags: [Language Management]
   *     responses:
   *       '200':
   *         description: A list of supported languages with their codes and names.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   code:
   *                     type: string
   *                   name:
   *                     type: string
   */
  getSupportedLanguages: (req, res) => {
    res.status(200).json(supportedLanguages);
  },
};

module.exports = AvailableLanguageController;
