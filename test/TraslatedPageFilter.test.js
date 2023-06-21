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

  it("should return filtered translation data for a specific language", async () => {
    const language = "fr";
    const contentId = "1";
    const modelName = "blog";

    // Create a mock TranslatedPage with the desired test data
    const mockTranslatedPage = {
      content_id: contentId,
      model_name: modelName,
      translations: [
        { fr: "French Translation" },
        { de: "German Translation" },
        { es: "Spanish Translation" },
      ],
    };

    // Stub the TranslatedPage.findOne method to return the mockTranslatedPage
    findOneStub.resolves(mockTranslatedPage);

    // Call the filterTranslation function with the test parameters
    const result = await filterTranslation({
      query: { language, content_id: contentId, model_name: modelName },
    });

    // Expectations
    expect(result.success).to.be.true;
    expect(result.data).to.deep.equal({ fr: "French Translation" });
  });

  it("should return error if translations are not found for a specific language", async () => {
    const language = "fr";
    const contentId = "1";
    const modelName = "blog";

    // Create a mock TranslatedPage without the translations for the specified language
    const mockTranslatedPage = {
      content_id: contentId,
      model_name: modelName,
      translations: [
        { de: "German Translation" },
        { es: "Spanish Translation" },
      ],
    };

    // Stub the TranslatedPage.findOne method to return the mockTranslatedPage
    sinon.stub(TranslatedPage, "findOne").resolves(mockTranslatedPage);

    // Call the filterTranslation function with the test parameters
    const result = await filterTranslation({
      query: { language, content_id: contentId, model_name: modelName },
    });

    // Expectations
    expect(result.success).to.be.false;
    expect(result.error).to.equal("Translations not found for language fr");

    // Restore the stubbed TranslatedPage.findOne method
    TranslatedPage.findOne.restore();
  });

  it("should return the entire TranslatedPage if language is not specified", async () => {
    const contentId = "1";
    const modelName = "blog";

    // Create a mock TranslatedPage with the desired test data
    const mockTranslatedPage = {
      content_id: contentId,
      model_name: modelName,
      translations: [
        { fr: "French Translation" },
        { de: "German Translation" },
        { es: "Spanish Translation" },
      ],
    };

    // Stub the TranslatedPage.findOne method to return the mockTranslatedPage
    sinon.stub(TranslatedPage, "findOne").resolves(mockTranslatedPage);

    // Call the filterTranslation function with the test parameters
    const result = await filterTranslation({
      query: { content_id: contentId, model_name: modelName },
    });

    // Expectations
    expect(result.success).to.be.true;
    expect(result.data).to.deep.equal(mockTranslatedPage);

    // Restore the stubbed TranslatedPage.findOne method
    TranslatedPage.findOne.restore();
  });

  it("should return error if TranslatedPage is not found", async () => {
    const contentId = "1";
    const modelName = "blog";

    // Stub the TranslatedPage.findOne method to return null (no TranslatedPage found)
    sinon.stub(TranslatedPage, "findOne").resolves(null);

    // Call the filterTranslation function with the test parameters
    const result = await filterTranslation({
      query: { content_id: contentId, model_name: modelName },
    });

    // Expectations
    expect(result.success).to.be.false;
    expect(result.error).to.equal("Translations not found.");

    // Restore the stubbed TranslatedPage.findOne method
    TranslatedPage.findOne.restore();
  });

  it("should handle errors and return an error message", async () => {
    const language = "fr";
    const contentId = "1";
    const modelName = "blog";

    // Stub the TranslatedPage.findOne method to throw an error
    sinon
      .stub(TranslatedPage, "findOne")
      .throws(new Error("Failed to fetch TranslatedPage"));

    // Call the filterTranslation function with the test parameters
    const result = await filterTranslation({
      query: { language, content_id: contentId, model_name: modelName },
    });

    // Expectations
    expect(result.success).to.be.false;
    expect(result.error).to.equal("Failed to fetch TranslatedPage");

    // Restore the stubbed TranslatedPage.findOne method
    TranslatedPage.findOne.restore();
  });
});
