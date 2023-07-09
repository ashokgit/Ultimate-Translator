const { expect } = require("chai");
const { updateTranslation } = require("../controllers/TranslateController");
const TranslatedPage = require("../models/TranslatedPage");

describe("updateTranslation", function () {
  this.timeout(15000);

  it("should update the translation for the specified language", async () => {
    const req = {
      body: {
        content_id: "123",
        model_name: "YourModel",
        language: "en",
        updatedJson: '{"title": "Updated Title"}',
      },
    };

    const res = {
      status: function (statusCode) {
        expect(statusCode).to.equal(200);
        return this;
      },
      json: function (response) {
        expect(response.success).to.be.true;
        expect(response.data.translations).to.deep.equal([
          { en: { title: "Updated Title" } },
        ]);
      },
    };

    const existingTranslatedPage = {
      translations: [{ en: { title: "Original Title" } }],
      markModified: () => {},
      save: () => {},
    };
    TranslatedPage.findOne = () => existingTranslatedPage;

    await updateTranslation(req, res);
  });

  it("should return 404 if the translation is not found", async () => {
    const req = {
      body: {
        content_id: "123",
        model_name: "YourModel",
        language: "en",
        updatedJson: '{"title": "Updated Title"}',
      },
    };

    const res = {
      status: function (statusCode) {
        expect(statusCode).to.equal(404);
        return this;
      },
      json: function (response) {
        expect(response.success).to.be.false;
        expect(response.error).to.equal("Translation not found");
      },
    };
  });

  it("should return 404 if the language translation is not found", async () => {
    const req = {
      body: {
        content_id: "123",
        model_name: "YourModel",
        language: "en",
        updatedJson: '{"title": "Updated Title"}',
      },
    };

    const res = {
      status: function (statusCode) {
        expect(statusCode).to.equal(404);
        return this;
      },
      json: function (response) {
        expect(response.success).to.be.false;
        expect(response.error).to.equal("Language translation not found");
      },
    };
  });

  it("should handle errors and return 500", async () => {
    const req = {
      body: {
        content_id: "123",
        model_name: "YourModel",
        language: "en",
        updatedJson: '{"title": "Updated Title"}',
      },
    };

    const res = {
      status: function (statusCode) {
        expect(statusCode).to.equal(500);
        return this;
      },
      json: function (response) {
        expect(response.success).to.be.false;
        expect(response.error).to.equal("Failed to update translation");
      },
    };
  });
});
