const { expect } = require("chai");
const sinon = require("sinon");
const TextTranslator = require("../translators/TextTranslator");
const TranslationLog = require("../models/TranslationLog");
const StringTranslatorController = require("../controllers/StringTranslatorController");
const {
  validateStringTranslation,
} = require("../validations/stringTranslatorValidate");

describe("StringTranslatorController", () => {
  describe("translateString", () => {
    it("should translate the string and save the translation log", async () => {
      const req = {
        body: {
          language: "fr",
          text: "Hello",
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      const translateStub = sinon
        .stub(TextTranslator.prototype, "translate")
        .resolves("Bonjour");
      const saveStub = sinon.stub(TranslationLog.prototype, "save").resolves();

      await StringTranslatorController.translateString(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith("Bonjour")).to.be.true;
      expect(translateStub.calledWith("Hello", "fr")).to.be.true;
      expect(saveStub.calledOnce).to.be.true;

      translateStub.restore();
      saveStub.restore();
    });

    it("should handle missing required fields and return 422 status", () => {
      const req = {
        body: {
          // Missing language and text fields
        },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };
      const next = sinon.spy();

      validateStringTranslation(req, res, next);

      sinon.assert.calledWith(res.status, 422);
      sinon.assert.calledWith(res.json, { error: '"language" is required' });
      sinon.assert.notCalled(next);
    });
  });
});
