const TranslationRulesService = require('../services/TranslationRulesService');

class TranslationRulesController {
  /**
   * @description Handles fetching the translation rules.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
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
   * @description Handles updating the translation rules.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
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