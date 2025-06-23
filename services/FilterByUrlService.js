const { TranslatedPage } = require("../models/TranslatedPage");

async function getTranslationByUrl(req) {
  try {
    const { language, url } = req.query;

    const query = {
      translations: {
        $elemMatch: {
          $and: [
            { [language]: { $exists: true } },
            {
              $or: [
                { [`${language}.url`]: url },
                { [`${language}.old_urls`]: url },
              ],
            },
          ],
        },
      },
    };

    const translatedPage = await TranslatedPage.findOne(query);

    if (!translatedPage) {
      return { success: false, error: "Translated page not found." };
    }

    return { success: true, data: translatedPage };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = getTranslationByUrl;
