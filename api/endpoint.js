const express = require("express");
const router = express.Router();
const {
  postTranslate,
  translatePage,
  translationFilter,
  updateTranslation,
} = require("../controllers/TranslateController");
const { default: axios } = require("axios");
const { changeSource } = require("../controllers/SourceController");

// Define API routes
router.get("/translation-filter", translationFilter);
router.get("/translate", translatePage);
router.post("/update-translation", updateTranslation);

router.put("/update-source", changeSource);

router.get("/getJsonContent", async (req, res) => {
  try {
    const sourceUrl = req.query.sourceUrl;
    const response = await axios.get(sourceUrl);

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

module.exports = router;
