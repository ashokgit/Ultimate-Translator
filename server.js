const express = require("express");
const mongoose = require("mongoose");
const config = require("./config");
const logger = require("./utils/logger");
const connectDB = require("./db/connect");
const apiRoutes = require("./api/endpoint");
const path = require("path");
const bodyParser = require("body-parser");

const { translate } = require("@vitalets/google-translate-api");
const TextTranslator = require("./translators/TextTranslator");

const app = express();

// Setup request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });
  
  next();
});

// Connect to MongoDB
connectDB();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Define routes
app.use("/api/v1", apiRoutes);

app.get("/make-translate", async (req, res) => {
  const translator = new TextTranslator();
  const response = translator.translate(
    "Non-Alcoholic Concentrated Perfume Oil",
    "fr"
  );
  res.status(200).json(response);
});

// Start the server
const port = config.server.port;
app.listen(port, () => {
  logger.info("Server started successfully", {
    port: port,
    environment: config.server.nodeEnv,
    defaultTranslator: config.translation.defaultProvider
  });
});
