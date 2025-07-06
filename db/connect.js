const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      const startTime = Date.now();
      
      // Enhanced connection options with pooling
      const connectionOptions = {
        serverSelectionTimeoutMS: 30000, // Wait up to 30s to select a server
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 2, // Maintain at least 2 socket connections
        maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
        connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
        heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
        retryWrites: true, // Retry write operations if they fail
        retryReads: true, // Retry read operations if they fail
        w: 'majority', // Write concern: wait for majority of replica set members
        readPreference: 'primaryPreferred' // Prefer primary, fallback to secondary
      };

      await mongoose.connect(config.database.uri, connectionOptions);

      const connectionTime = Date.now() - startTime;
      
      // Set up connection event listeners
      mongoose.connection.on('connected', () => {
        // Safely access pool size from the client object
        const poolSize = mongoose.connection.getClient()?.s?.pool?.size ?? 'N/A';

        logger.info("MongoDB connection established", {
          uri: config.database.uri,
          connectionTime: `${connectionTime}ms`,
          poolSize: poolSize
        });
      });

      mongoose.connection.on('error', (err) => {
        logger.error("MongoDB connection error", {
          error: err.message,
          stack: err.stack
        });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn("MongoDB connection disconnected");
      });

      mongoose.connection.on('reconnected', () => {
        logger.info("MongoDB connection reestablished");
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed through app termination");
          process.exit(0);
        } catch (err) {
          logger.error("Error closing MongoDB connection", { error: err.message });
          process.exit(1);
        }
      });

      return; // Success
    } catch (error) {
      retries -= 1;
      logger.error("MongoDB connection error, retrying...", {
        error: error.message,
        retriesLeft: retries,
        stack: error.stack
      });
      if (retries === 0) {
        logger.error("Could not connect to MongoDB after multiple retries. Exiting.", {
          uri: config.database.uri,
        });
        process.exit(1);
      }
      // Exponential backoff: wait longer between retries
      const waitTime = Math.min(1000 * Math.pow(2, 5 - retries), 30000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

module.exports = connectDB;
