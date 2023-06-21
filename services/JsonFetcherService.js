const axios = require("axios");

class JsonFetcherService {
  async fetchData(sourceUrl) {
    try {
      const response = await axios.get(sourceUrl);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch data from source URL: ${error.message}`);
      throw new Error("Failed to fetch data from source URL");
    }
  }
}

module.exports = JsonFetcherService;
