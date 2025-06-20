const googleTranslate = require("@vitalets/google-translate-api");
const { ProxyAgent } = require("proxy-agent");
const config = require("../config");
const logger = require("../utils/logger");
const { TranslationError } = require("../utils/errorHandler");

class GoogleTranslator {
  constructor() {
    this.proxyUrls = config.google.proxies;
    
    if (this.proxyUrls.length === 0) {
      logger.warn("No proxy URLs configured for Google Translator. Consider setting GOOGLE_TRANSLATE_PROXIES environment variable for better reliability.");
    } else {
      logger.info("Google Translator initialized", { 
        proxyCount: this.proxyUrls.length,
        proxies: this.proxyUrls.map(url => url.replace(/\/\/.*@/, '//***:***@')) // Hide credentials
      });
    }
  }

  async translate(originalString, targetLanguage) {
    const startTime = Date.now();
    const proxyUrl = this.getRandomProxyUrl();
    
    try {
      const agent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
      
      logger.debug("Starting Google translation", {
        textLength: originalString.length,
        targetLanguage,
        usingProxy: !!proxyUrl,
        proxyUrl: proxyUrl ? proxyUrl.replace(/\/\/.*@/, '//***:***@') : null
      });
      
      const { text } = await googleTranslate.translate(originalString, {
        to: targetLanguage,
        agent,
      });

      const translationTime = Date.now() - startTime;
      logger.logTranslation('google', originalString, targetLanguage, true);
      
      logger.debug("Google translation completed", {
        translationTime: `${translationTime}ms`,
        resultLength: text.length
      });

      return text;
    } catch (error) {
      const translationTime = Date.now() - startTime;
      logger.logTranslation('google', originalString, targetLanguage, false, error);
      
      logger.error("Google translation failed", {
        error: error.message,
        translationTime: `${translationTime}ms`,
        proxyUrl: proxyUrl ? proxyUrl.replace(/\/\/.*@/, '//***:***@') : null,
        textLength: originalString.length,
        targetLanguage
      });
      
      throw new TranslationError('Google', error.message);
    }
  }

  getRandomProxyUrl() {
    if (this.proxyUrls.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.proxyUrls.length);
    return this.proxyUrls[randomIndex];
  }
}

module.exports = GoogleTranslator;
