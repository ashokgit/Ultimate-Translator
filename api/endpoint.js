const express = require("express");
const router = express.Router();
const {
  postTranslate,
  translatePage,
  translationFilter,
} = require("../controllers/TranslateController");
const { default: axios } = require("axios");

// Define API routes
router.get("/translation-filter", translationFilter);
router.get("/translate", translatePage);
// router.post("/translate", postTranslate);

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
