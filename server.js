const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db/connect");
const apiRoutes = require("./api/endpoint");
const path = require("path");

const { translate } = require("@vitalets/google-translate-api");
const TextTranslator = require("./translators/TextTranslator");

const app = express();

// Connect to MongoDB
connectDB();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

// Define routes
app.use("/api/v1", apiRoutes);

app.get("/make-translate", async (req, res) => {
  const translator = new TextTranslator();
  const response = translator.translate("Hello Hi", "fr");
  res.send(response); // Send the translated text as the response
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
