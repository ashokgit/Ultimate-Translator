const { TranslatedPage, FieldApproval } = require("../models/TranslatedPage");
const crypto = require('crypto');

class FieldApprovalService {
  
  // Generate a hash for consistent field identification
  static generateContentHash(originalText, translatedText, sourceLanguage, targetLanguage) {
    const content = `${originalText}|${translatedText}|${sourceLanguage}|${targetLanguage}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Save field approval status
  static async saveFieldApproval(approvalData) {
    try {
      const {
        content_id,
        model_name,
        language,
        field_path,
        original_text,
        translated_text,
        status,
        reviewed_by = 'user'
      } = approvalData;

      const source_language = 'en'; // Default source language
      const target_language = language;
      
      const contentHash = this.generateContentHash(
        original_text,
        translated_text,
        source_language,
        target_language
      );

      // Find or create field approval record
      let fieldApproval = await FieldApproval.findOne({ content_hash: contentHash });
      
      if (fieldApproval) {
        // Update existing record
        fieldApproval.status = status;
        fieldApproval.reviewed_at = new Date();
        fieldApproval.reviewed_by = reviewed_by;
        
        // Add content_id if not already present
        if (!fieldApproval.content_ids.includes(content_id)) {
          fieldApproval.content_ids.push(content_id);
        }
        
        await fieldApproval.save();
      } else {
        // Create new record
        fieldApproval = new FieldApproval({
          original_text,
          translated_text,
          source_language,
          target_language,
          field_path,
          status,
          reviewed_at: new Date(),
          reviewed_by,
          model_name,
          content_ids: [content_id],
          content_hash: contentHash
        });
        
        await fieldApproval.save();
      }

      // Update the specific document's field approval status
      await this.updateDocumentFieldStatus(content_id, model_name, language, field_path, status);
      
      // Update all other documents with the same content
      await this.updateCrossDocumentApprovals(contentHash, status, reviewed_by);
      
      return {
        success: true,
        data: fieldApproval,
        affected_documents: fieldApproval.content_ids.length
      };
      
    } catch (error) {
      console.error('Error saving field approval:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update field status in a specific document
  static async updateDocumentFieldStatus(content_id, model_name, language, field_path, status) {
    try {
      const document = await TranslatedPage.findOne({ content_id, model_name });
      
      if (document) {
        if (!document.field_approval_status[language]) {
          document.field_approval_status[language] = {};
        }
        
        document.field_approval_status[language][field_path] = {
          status,
          reviewed_at: new Date(),
          reviewed_by: 'user'
        };
        
        document.markModified('field_approval_status');
        await document.save();
      }
      
    } catch (error) {
      console.error('Error updating document field status:', error);
    }
  }

  // Update approval status across all documents with the same content
  static async updateCrossDocumentApprovals(contentHash, status, reviewed_by) {
    try {
      const fieldApproval = await FieldApproval.findOne({ content_hash: contentHash });
      
      if (!fieldApproval) return;
      
      // Find all documents that contain this field
      const documents = await TranslatedPage.find({
        content_id: { $in: fieldApproval.content_ids }
      });
      
      for (const document of documents) {
        const language = fieldApproval.target_language;
        
        if (!document.field_approval_status[language]) {
          document.field_approval_status[language] = {};
        }
        
        document.field_approval_status[language][fieldApproval.field_path] = {
          status,
          reviewed_at: new Date(),
          reviewed_by
        };
        
        document.markModified('field_approval_status');
        await document.save();
      }
      
    } catch (error) {
      console.error('Error updating cross-document approvals:', error);
    }
  }

  // Get field approval status for a document
  static async getFieldApprovals(content_id, model_name, language) {
    try {
      const document = await TranslatedPage.findOne({ content_id, model_name });
      
      if (!document) {
        return { success: false, error: 'Document not found' };
      }
      
      const approvals = document.field_approval_status[language] || {};
      
      return {
        success: true,
        data: approvals
      };
      
    } catch (error) {
      console.error('Error getting field approvals:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get global field approval statistics
  static async getApprovalStatistics() {
    try {
      const stats = await FieldApproval.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const result = {
        approved: 0,
        rejected: 0,
        pending: 0,
        total: 0
      };
      
      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error('Error getting approval statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Bulk approve/reject fields
  static async bulkUpdateFields(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const result = await this.saveFieldApproval(update);
        results.push(result);
      }
      
      return {
        success: true,
        data: results,
        processed: results.length,
        successful: results.filter(r => r.success).length
      };
      
    } catch (error) {
      console.error('Error in bulk update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FieldApprovalService; 