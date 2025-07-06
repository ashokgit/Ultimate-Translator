const { TranslatedPage } = require("../models/TranslatedPage");
const logger = require("../utils/logger");

const filterTranslation = async (req) => {
  try {
    const { language, content_id, model_name, page = 1, limit = 10 } = req.query;
    
    // Build query object
    const query = {};
    
    if (language) {
      query["translations"] = { $elemMatch: { [language]: { $exists: true } } };
    }
    
    if (content_id) {
      query.content_id = content_id;
    }
    
    if (model_name) {
      query.model_name = model_name;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    // Get total count for pagination metadata
    const totalCount = await TranslatedPage.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Execute query with pagination
    const results = await TranslatedPage.find(query)
      .sort({ last_requested_at: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();
    
    logger.info("Translation filter executed", {
      query: req.query,
      resultCount: results.length,
      totalCount,
      page: parseInt(page),
      totalPages
    });
    
    return {
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: pageSize,
        totalCount,
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };
    
  } catch (error) {
    logger.error("Translation filter failed", {
      query: req.query,
      error: error.message
    });
    
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = filterTranslation;
