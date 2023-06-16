const { translate } = require("@vitalets/google-translate-api");
const { ProxyAgent } = require("proxy-agent");

class GoogleTranslator {
  constructor() {
    this.proxyUrls = [
      "http://103.152.112.162:80",
      "http://203.150.153.118:8080",
      "http://123.123.123.123:8888",
      "http://47.90.162.160",
      "http://46.149.77.234",
      "http://34.146.64.228",
      "http://201.213.91.215",
      "http://52.59.210.203",
      "http://20.210.113.32",
      "http://217.76.50.200",
      "http://46.47.197.210",
      "http://8.213.137.155",
      "http://103.118.78.194",
      "http://190.61.88.147",
      "http://203.89.126.250",
    ];
  }

  async translate(originalString, targetLanguage) {
    try {
      const proxyUrl = this.getRandomProxyUrl();
      const agent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
      const { text } = await translate(originalString, {
        to: targetLanguage,
        agent,
      });

      return text;
    } catch (error) {
      console.error(
        `Failed to translate using Google Translator: ${error.message}`
      );
      throw new Error("Failed to translate");
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
