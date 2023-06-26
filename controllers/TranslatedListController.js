const TranslatedPage = require("../models/TranslatedPage");
const filterAndGroup = require("../services/FilterAndGroupTranslationService");

const TranslatedListController = {
  filterList: async (req, res) => {
    const filterResponse = await filterAndGroup(req);

    if (filterResponse.success) {
      res.status(200).json(filterResponse.data);
    } else {
      res.status(404).json({ error: filterResponse.error });
    }
  },
};

module.exports = TranslatedListController;
