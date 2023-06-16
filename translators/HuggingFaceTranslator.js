const axios = require("axios");

class HuggingFaceTranslator {
  constructor(translatorUrl) {
    this.translatorUrl = "http://translator:5000";
  }

  async translate(text, lang) {
    try {
      const payload = {
        text: text,
        lang: lang,
      };

      const response = await axios.post(
        `${this.translatorUrl}/api/v1/translate`,
        payload
      );
      if (response.status === 200) {
        return response.data.translated_text;
      } else {
        throw new Error("Translation request failed.");
      }
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    }
  }
}

module.exports = HuggingFaceTranslator;
