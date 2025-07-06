const TranslationRulesService = require('../services/TranslationRulesService');

/**
 * @swagger
 * tags:
 *   name: Translation Rules
 *   description: Endpoints for managing translation rules.
 */
class TranslationRulesController {
  /**
   * @swagger
   * /api/v1/translation-rules:
   *   get:
   *     summary: Get the current translation rules
   *     tags: [Translation Rules]
   *     responses:
   *       '200':
   *         description: The current translation rules.
   */
  static async getTranslationRules(req, res) {
    try {
      const rules = await TranslationRulesService.getRules();
      res.status(200).json(rules);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * @swagger
   * /api/v1/translation-rules:
   *   put:
   *     summary: Update the translation rules
   *     tags: [Translation Rules]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       '200':
   *         description: Translation rules updated successfully.
   */
  static async updateTranslationRules(req, res) {
    try {
      const newRules = req.body;
      // Basic validation: ensure we're not writing an empty object
      if (!newRules || Object.keys(newRules).length === 0) {
        return res.status(400).json({ message: 'Invalid rules object provided.' });
      }
      await TranslationRulesService.updateRules(newRules);
      res.status(200).json({ message: 'Translation rules updated successfully.' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = TranslationRulesController; 