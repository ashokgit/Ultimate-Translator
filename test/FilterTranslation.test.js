const chai = require("chai");
const sinon = require("sinon");
const TranslatedPage = require("../models/TranslatedPage");
const filterTranslation = require("../services/FilterTranslationService");

const expect = chai.expect;

describe("filterTranslation", () => {
  let findOneStub;

  beforeEach(() => {
    findOneStub = sinon.stub(TranslatedPage, "findOne");
  });

  afterEach(() => {
    findOneStub.restore();
  });

  it("should return filtered translation for a valid language", async () => {
    findOneStub.resolves({
      translations: [
        { en: "English content" },
        { fr: "French content" },
        { es: "Spanish content" },
      ],
    });

    const req = {
      query: { language: "fr", content_id: "123", model_name: "Model" },
    };
    const filterResponse = await filterTranslation(req);

    expect(filterResponse.success).to.be.true;
    expect(filterResponse.data).to.deep.equal({ fr: "French content" });
  });

  it("should return translations if language is not provided", async () => {
    const existingTranslatedPage = {
      translations: [
        { en: "English content" },
        { fr: "French content" },
        { es: "Spanish content" },
      ],
    };

    findOneStub.resolves(existingTranslatedPage);

    const req = { query: { content_id: "123", model_name: "Model" } };
    const filterResponse = await filterTranslation(req);

    expect(filterResponse.success).to.be.true;
    expect(filterResponse.data).to.deep.equal(existingTranslatedPage);
  });

  it("should return error if translations are not found", async () => {
    findOneStub.resolves(null);

    const req = {
      query: { language: "fr", content_id: "123", model_name: "Model" },
    };
    const filterResponse = await filterTranslation(req);

    expect(filterResponse.success).to.be.false;
    expect(filterResponse.error).to.equal("Translations not found.");
  });

  it("should return error if translations are not found for a specific language", async () => {
    const existingTranslatedPage = {
      translations: [
        { en: "English content" },
        { fr: "French content" },
        { es: "Spanish content" },
      ],
    };

    findOneStub.resolves(existingTranslatedPage);

    const req = {
      query: { language: "de", content_id: "123", model_name: "Model" },
    };
    const filterResponse = await filterTranslation(req);

    expect(filterResponse.success).to.be.false;
    expect(filterResponse.error).to.equal(
      "Translations not found for language de."
    );
  });

  it("should return error if an exception occurs", async () => {
    findOneStub.rejects(new Error("Database error"));

    const req = {
      query: { language: "fr", content_id: "123", model_name: "Model" },
    };
    const filterResponse = await filterTranslation(req);

    expect(filterResponse.success).to.be.false;
    expect(filterResponse.error).to.equal("Database error");
  });
});
