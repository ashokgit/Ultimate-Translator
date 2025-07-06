const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      const startTime = Date.now();
      await mongoose.connect(config.database.uri, {
        serverSelectionTimeoutMS: 30000, // Wait up to 30s to select a server
      });

      const connectionTime = Date.now() - startTime;
      logger.info("Connected to MongoDB", {
        uri: config.database.uri,
        connectionTime: `${connectionTime}ms`,
      });
      return; // Success
    } catch (error) {
      retries -= 1;
      logger.error("MongoDB connection error, retrying...", {
        error: error.message,
        retriesLeft: retries,
      });
      if (retries === 0) {
        logger.error("Could not connect to MongoDB after multiple retries. Exiting.", {
          uri: config.database.uri,
        });
        process.exit(1);
      }
      // Wait for a short period before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
