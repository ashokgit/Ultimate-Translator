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
  metadata: {
    type: Object,
    required: false,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Add indexes for better query performance
translatedPageSchema.index({ content_id: 1, model_name: 1 });
translatedPageSchema.index({ source_url: 1 });
translatedPageSchema.index({ last_requested_at: 1 });

const TranslatedPage = mongoose.model("TranslatedPage", translatedPageSchema);

module.exports = TranslatedPage;
