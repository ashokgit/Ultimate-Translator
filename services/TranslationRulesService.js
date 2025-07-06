const fs = require('fs/promises');
const path = require('path');

const rulesFilePath = path.join(__dirname, '..', 'config', 'translation-rules.json');

class TranslationRulesService {
  /**
   * @description Reads and returns the translation rules from the JSON file.
   * @returns {Promise<Object>} The translation rules object.
   */
  static async getRules() {
    try {
      const data = await fs.readFile(rulesFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading translation rules file:', error);
      throw new Error('Could not read translation rules.');
    }
  }

  /**
   * @description Updates the translation rules in the JSON file.
   * @param {Object} newRules - The new rules object to save.
   * @returns {Promise<void>}
   */
  static async updateRules(newRules) {
    try {
      // Read the current rules to get the current version
      const currentData = await fs.readFile(rulesFilePath, 'utf8');
      const currentRules = JSON.parse(currentData);
      let version = currentRules.version || '1.0.0';
      // Increment patch version
      const parts = version.split('.').map(Number);
      parts[2] = (parts[2] || 0) + 1;
      const newVersion = parts.join('.');
      newRules.version = newVersion;
      const data = JSON.stringify(newRules, null, 2);
      await fs.writeFile(rulesFilePath, data, 'utf8');
    } catch (error) {
      console.error('Error writing translation rules file:', error);
      throw new Error('Could not update translation rules.');
    }
  }
}

module.exports = TranslationRulesService; 