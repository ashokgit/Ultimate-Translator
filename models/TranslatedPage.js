const mongoose = require("mongoose");

const translatedPageSchema = new mongoose.Schema({
  content_id: {
    type: String,
    required: true,
  },
  source_url: {
    type: String,
    required: true,
  },
  last_requested_at: {
    type: Date,
    default: Date.now,
  },
  model_name: {
    type: String,
    required: true,
  },
  source_data: {
    type: Object,
    required: true,
  },
  translations: {
    type: [Object],
    required: true,
  },
  field_approval_status: {
    type: Object,
    default: {},
    // Structure: { "language": { "field.path": { status: "approved|rejected|pending", reviewed_at: Date, reviewed_by: String } } }
  },
  metadata: {
    type: Object,
    required: false,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Schema for tracking field approvals globally across documents
const fieldApprovalSchema = new mongoose.Schema({
  original_text: {
    type: String,
    required: true,
    index: true
  },
  translated_text: {
    type: String,
    required: true,
    index: true
  },
  source_language: {
    type: String,
    required: true,
    default: 'en'
  },
  target_language: {
    type: String,
    required: true
  },
  field_path: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['approved', 'rejected', 'pending'],
    default: 'pending'
  },
  reviewed_at: {
    type: Date
  },
  reviewed_by: {
    type: String,
    default: 'system'
  },
  model_name: {
    type: String,
    required: true
  },
  content_ids: [{
    type: String,
    required: true
  }],
  // Hash for quick lookups
  content_hash: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
fieldApprovalSchema.index({ 
  original_text: 1, 
  translated_text: 1, 
  target_language: 1, 
  source_language: 1 
});

fieldApprovalSchema.index({ content_hash: 1 });

// Add indexes for better query performance
translatedPageSchema.index({ content_id: 1, model_name: 1 });
translatedPageSchema.index({ source_url: 1 });
translatedPageSchema.index({ last_requested_at: 1 });

const TranslatedPage = mongoose.model("TranslatedPage", translatedPageSchema);
const FieldApproval = mongoose.model("FieldApproval", fieldApprovalSchema);

module.exports = { TranslatedPage, FieldApproval };
