const { TranslatedPage, FieldApproval } = require("../models/TranslatedPage");
const filterAndGroup = require("../services/FilterAndGroupTranslationService");
const FieldApprovalService = require("../services/FieldApprovalService");

/**
 * @swagger
 * tags:
 *   name: Translated List Management
 *   description: Endpoints for managing and filtering translated content.
 */
const TranslatedListController = {
  /**
   * @swagger
   * /api/v1/translated-list:
   *   get:
   *     summary: Filter and group translated content
   *     tags: [Translated List Management]
   *     responses:
   *       '200':
   *         description: A list of filtered and grouped translations.
   *       '404':
   *         description: No translations found.
   */
  filterList: async (req, res) => {
    const filterResponse = await filterAndGroup(req);

    if (filterResponse.success) {
      res.status(200).json(filterResponse.data);
    } else {
      res.status(404).json({ error: filterResponse.error });
    }
  },

  /**
   * @swagger
   * /api/v1/model-names:
   *   get:
   *     summary: Get all unique model names
   *     tags: [Translated List Management]
   *     responses:
   *       '200':
   *         description: A list of model names.
   */
  getModelNames: async (req, res) => {
    try {
      // Get all unique model names from the database
      const modelNames = await TranslatedPage.distinct("model_name");
      
      // Sort alphabetically for better UX
      const sortedModelNames = modelNames.sort();
      
      res.status(200).json({
        success: true,
        data: sortedModelNames,
        total: sortedModelNames.length
      });
    } catch (error) {
      console.error("Error fetching model names:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch model names" 
      });
    }
  },

  /**
   * @swagger
   * /api/v1/translation-comparison:
   *   get:
   *     summary: Get a comparison between source and translated data
   *     tags: [Translated List Management]
   *     parameters:
   *       - in: query
   *         name: content_id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: model_name
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: language
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: A comparison of source and translated data.
   *       '404':
   *         description: Translation not found.
   */
  getTranslationComparison: async (req, res) => {
    try {
      const { content_id, model_name, language } = req.query;

      // Validate required fields
      if (!content_id || !model_name || !language) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: content_id, model_name, language"
        });
      }

      console.log("Debug - Query params:", { content_id, model_name, language });

      // Find the translated page
      const translatedPage = await TranslatedPage.findOne({
        content_id,
        model_name
      });

      console.log("Debug - Found translated page:", translatedPage ? "Yes" : "No");
      if (translatedPage) {
        console.log("Debug - Available languages:", translatedPage.translations.map(t => Object.keys(t)[0]));
      }

      if (!translatedPage) {
        return res.status(404).json({
          success: false,
          error: "Translation not found"
        });
      }

      // Find the translation for the specific language
      const translation = translatedPage.translations.find(
        trans => Object.keys(trans)[0] === language
      );

      console.log("Debug - Found translation for language:", translation ? "Yes" : "No");

      if (!translation) {
        return res.status(404).json({
          success: false,
          error: `Translation not found for language: ${language}. Available: ${translatedPage.translations.map(t => Object.keys(t)[0]).join(', ')}`
        });
      }

      const translationData = translation[language];

      // Get field approval status for this document
      const fieldApprovals = await FieldApprovalService.getFieldApprovals(content_id, model_name, language);

      res.status(200).json({
        success: true,
        data: {
          source_data: translatedPage.source_data,
          translation_data: translationData,
          field_approvals: fieldApprovals.success ? fieldApprovals.data : {},
          metadata: {
            content_id,
            model_name,
            language,
            source_url: translatedPage.source_url,
            last_updated: translatedPage.updated_at || translatedPage.created_at
          }
        }
      });

    } catch (error) {
      console.error("Error fetching translation comparison:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch translation comparison"
      });
    }
  },

  /**
   * @swagger
   * /api/v1/field-approval:
   *   post:
   *     summary: Save approval status for a specific field
   *     tags: [Translated List Management]
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
   *               field_path:
   *                 type: string
   *               original_text:
   *                 type: string
   *               translated_text:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [approved, rejected, pending]
   *     responses:
   *       '200':
   *         description: Field approval status saved successfully.
   */
  saveFieldApproval: async (req, res) => {
    try {
      const {
        content_id,
        model_name,
        language,
        field_path,
        original_text,
        translated_text,
        status
      } = req.body;

      // Validate required fields
      if (!content_id || !model_name || !language || !field_path || !original_text || !translated_text || !status) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields"
        });
      }

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status. Must be 'approved', 'rejected', or 'pending'"
        });
      }

      const result = await FieldApprovalService.saveFieldApproval({
        content_id,
        model_name,
        language,
        field_path,
        original_text,
        translated_text,
        status,
        reviewed_by: 'user'
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Field ${status} successfully`,
          data: result.data,
          affected_documents: result.affected_documents
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error("Error saving field approval:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save field approval"
      });
    }
  },

  /**
   * @swagger
   * /api/v1/field-approvals/bulk:
   *   post:
   *     summary: Bulk save field approval statuses
   *     tags: [Translated List Management]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               approvals:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       '200':
   *         description: Bulk operation completed successfully.
   */
  bulkSaveFieldApprovals: async (req, res) => {
    try {
      const { approvals } = req.body;

      if (!Array.isArray(approvals) || approvals.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Approvals array is required and must not be empty"
        });
      }

      const result = await FieldApprovalService.bulkUpdateFields(approvals);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Bulk operation completed: ${result.successful}/${result.processed} successful`,
          data: result.data,
          processed: result.processed,
          successful: result.successful
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error("Error in bulk field approval:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process bulk field approvals"
      });
    }
  },

  /**
   * @swagger
   * /api/v1/approval-statistics:
   *   get:
   *     summary: Get statistics on field approvals
   *     tags: [Translated List Management]
   *     responses:
   *       '200':
   *         description: A summary of field approval statistics.
   */
  getApprovalStatistics: async (req, res) => {
    try {
      const result = await FieldApprovalService.getApprovalStatistics();

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error("Error getting approval statistics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get approval statistics"
      });
    }
  },

  /**
   * @swagger
   * /api/v1/delete-translation:
   *   delete:
   *     summary: Delete a specific translation
   *     tags: [Translated List Management]
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
   *     responses:
   *       '200':
   *         description: Translation deleted successfully.
   *       '404':
   *         description: Translation not found.
   */
  deleteTranslation: async (req, res) => {
    try {
      const { content_id, model_name, language } = req.body;

      // Validate required fields
      if (!content_id || !model_name || !language) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: content_id, model_name, language"
        });
      }

      // Find the translated page
      const translatedPage = await TranslatedPage.findOne({
        content_id,
        model_name
      });

      if (!translatedPage) {
        return res.status(404).json({
          success: false,
          error: "Translation not found"
        });
      }

      // Find the translation for the specific language
      const languageIndex = translatedPage.translations.findIndex(
        translation => Object.keys(translation)[0] === language
      );

      if (languageIndex === -1) {
        return res.status(404).json({
          success: false,
          error: `Translation not found for language: ${language}`
        });
      }

      // Remove the language translation
      translatedPage.translations.splice(languageIndex, 1);

      // If no translations left, delete the entire document
      if (translatedPage.translations.length === 0) {
        await TranslatedPage.findByIdAndDelete(translatedPage._id);
        return res.status(200).json({
          success: true,
          message: "Translation deleted successfully. Document removed as no translations remain.",
          deleted_entire_document: true
        });
      } else {
        // Save the updated document
        translatedPage.markModified("translations");
        await translatedPage.save();
        
        return res.status(200).json({
          success: true,
          message: "Translation deleted successfully",
          remaining_translations: translatedPage.translations.length
        });
      }

    } catch (error) {
      console.error("Error deleting translation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete translation"
      });
    }
  }
};

module.exports = TranslatedListController;
