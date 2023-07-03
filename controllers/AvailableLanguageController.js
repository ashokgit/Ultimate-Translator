const getAvailableLanguages = require("../services/AvailableLanguageFilterService");

const AvailableLanguageController = {
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
