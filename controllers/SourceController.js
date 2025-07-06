const { TranslatedPage } = require("../models/TranslatedPage");
const SourceCompareService = require("../services/SourceCompareService");

/**
 * @swagger
 * tags:
 *   name: Source Management
 *   description: Endpoints for managing source content.
 */
const sourceController = {
  /**
   * @swagger
   * /api/v1/update-source:
   *   put:
   *     summary: Update the source data for a translation
   *     tags: [Source Management]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               updatedJson:
   *                 type: string
   *               content_id:
   *                 type: string
   *               model_name:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Source data updated successfully.
   *       '404':
   *         description: Translation not found.
   */
  changeSource: async (req, res) => {
    try {
      const { updatedJson, content_id, model_name } = req.body;

      // Find the existing TranslatedPage
      const existingTranslatedPage = await TranslatedPage.findOne({
        content_id: content_id,
        model_name: model_name,
      });

      if (!existingTranslatedPage) {
        return res
          .status(404)
          .json({ success: false, error: "Translation not found" });
      }

      // Get the source data from the existing TranslatedPage
      const sourceData = existingTranslatedPage.source_data;

      // Create an instance of SourceComparer
      const sourceComparer = new SourceCompareService(content_id, model_name);

      // Compare and update the translations
      parsedUpdatedjSON = JSON.parse(updatedJson);
      sourceComparer.compareAndUpdate(sourceData, parsedUpdatedjSON);

      // Save the updated TranslatedPage
      await existingTranslatedPage.save();

      return res
        .status(200)
        .json({ success: true, data: existingTranslatedPage });
    } catch (error) {
      console.error(`Failed to update translation: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update translation" });
    }
  },
};

module.exports = sourceController;
