const getAvailableLanguages = require("../services/AvailableLanguageFilterService");

/**
 * @swagger
 * tags:
 *   name: Language Management
 *   description: Endpoints for managing available languages.
 */
const AvailableLanguageController = {
  /**
   * @swagger
   * /api/v1/available-languages:
   *   get:
   *     summary: Get a list of available languages
   *     tags: [Language Management]
   *     responses:
   *       '200':
   *         description: A list of available languages.
   *       '404':
   *         description: No languages found.
   */
  availableLanguages: async (req, res) => {
    const filterResponse = await getAvailableLanguages(req);

    if (filterResponse.success) {
      res.status(200).json(filterResponse.data);
    } else {
      res.status(404).json({ error: filterResponse.error });
    }
  },
};

module.exports = AvailableLanguageController;
