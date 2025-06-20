const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const startTime = Date.now();
    
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const connectionTime = Date.now() - startTime;
    
    logger.info("Connected to MongoDB", {
      uri: config.database.uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
      connectionTime: `${connectionTime}ms`,
    });
    
    logger.logDatabaseOperation("connect", "mongodb", true, null, connectionTime);
    
  } catch (error) {
    logger.error("Failed to connect to MongoDB", {
      uri: config.database.uri.replace(/\/\/.*@/, '//***:***@'),
      error: error.message,
    });
    
    logger.logDatabaseOperation("connect", "mongodb", false, error);
    
    // Exit process on connection failure
    process.exit(1);
  }
};

module.exports = connectDB;
