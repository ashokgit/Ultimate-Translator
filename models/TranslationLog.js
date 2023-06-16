const mongoose = require("mongoose");

// Define the translation log schema
const TranslationLogSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  lang: {
    type: String,
    required: true,
  },
  translated_text: {
    type: String,
    required: true,
  },
});

// Create the TranslationLog model
const TranslationLog = mongoose.model("TranslationLog", TranslationLogSchema);

module.exports = TranslationLog;
