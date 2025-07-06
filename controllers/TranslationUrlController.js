const TranslationUrlService = require("../services/TranslationUrlService");

/**
 * @swagger
 * tags:
 *   name: Translation URL Management
 *   description: Endpoints for managing translation URLs.
 */
const TranslationUrlController = {
  /**
   * @swagger
   * /api/v1/update-translation-url:
   *   put:
   *     summary: Update the URL for a specific translation
   *     tags: [Translation URL Management]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content_id:
   *                 type: string
   *               model_name:
   *                 type: string
   *               language:
   *                 type: string
   *               new_url:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Translation URL updated successfully.
   *       '404':
   *         description: Translation not found.
   */
  updateTranslationUrl: async (req, res) => {
    try {
      const { content_id, model_name, language, new_url } = req.body;

      const translationUpdateService = new TranslationUrlService();
      const result = await translationUpdateService.updateTranslationURL(
        content_id,
        model_name,
        language,
        new_url
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Translation URL updated successfully.",
        });
      } else {
        res.status(404).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = TranslationUrlController;
