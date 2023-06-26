const TranslatedPage = require("../models/TranslatedPage");

async function filterAndGroup(req) {
  try {
    const { model_name, content_id } = req.query;

    // Define the filter object based on the provided parameters
    const filter = {};

    if (model_name) {
      filter.model_name = model_name;
    }

    if (content_id) {
      filter.content_id = content_id;
    }

    // Retrieve all TranslatedPage objects matching the filter
    const translatedPages = await TranslatedPage.find(filter);

    // Group the translatedPages by model_name
    const groupedTranslations = translatedPages.reduce(
      (groups, translation) => {
        const model = translation.model_name;

        if (!groups[model]) {
          groups[model] = [];
        }

        const translations = translation.translations.map((trans) => {
          const language = Object.keys(trans)[0];
          const data = trans[language];
          const pendingCount = calculatePendingCount(data);

          return {
            [language]: {
              ...(data || {}),
              pending_count: pendingCount,
            },
          };
        });

        groups[model].push({
          _id: translation._id,
          model_name: translation.model_name,
          content_id: translation.content_id,
          source_url: translation.source_url,
          translations,
        });

        return groups;
      },
      {}
    );

    return { success: true, data: groupedTranslations };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function calculatePendingCount(data) {
  let count = 0;

  const processObject = (obj) => {
    if (obj && typeof obj === "object") {
      Object.values(obj).forEach((value) => {
        if (typeof value === "object") {
          processObject(value);
        }
      });

      if (obj.hasOwnProperty("verified") && obj.hasOwnProperty("auto_verify")) {
        if (obj.verified === false && obj.auto_verify === false) {
          count++;
        }
      }
    }
  };

  processObject(data);

  return count;
}

module.exports = filterAndGroup;
