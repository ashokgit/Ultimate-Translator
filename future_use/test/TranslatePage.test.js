const chai = require("chai");
const sinon = require("sinon");
const { translatePage } = require("../controllers/TranslateController");
const PageTranslationService = require("../services/PageTranslationService");

const expect = chai.expect;

describe("Translate Controller", function () {
  this.timeout(500000);
  describe("translatePage", () => {
    it("should successfully translate the page using the internal translation service", async () => {
      const req = {
        query: {
          model_name: "blog",
          language: "fr",
          source_url: "https://dummyjson.com/products/14",
          content_id: "1",
        },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub the PageTranslationService and mock the translatePage method
      const translationServiceStub = sinon.createStubInstance(
        PageTranslationService
      );
      const translationResponse = {
        translations: [{ fr: "This is a test translation." }],
      };
      translationServiceStub.translatePage.resolves(translationResponse);

      // Call the translatePage controller method
      await translatePage(req, res);

      // Assert the response
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(translationResponse)).to.be.true;

      // Restore the stubbed translation service
      sinon.restore();
    });

    it("should handle translation errors and return a 500 status", async () => {
      const req = {
        query: {
          model_name: "blog",
          language: "de",
          source_url: "https://dummyjson.com/products/14",
          content_id: "2",
        },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub the PageTranslationService and simulate a translation error
      const translationServiceStub = sinon.createStubInstance(
        PageTranslationService
      );
      const translationError = new Error("Translation failed.");
      translationServiceStub.translatePage.rejects(translationError);

      // Call the translatePage controller method
      await translatePage(req, res);

      // Assert the response
      expect(res.status.calledWith(500)).to.be.false;
      expect(res.json.calledWith({ error: translationError.message })).to.be
        .false;

      // Restore the stubbed translation service
      sinon.restore();
    });
  });
});
