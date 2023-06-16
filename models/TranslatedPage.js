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
});

const TranslatedPage = mongoose.model("TranslatedPage", translatedPageSchema);

module.exports = TranslatedPage;
