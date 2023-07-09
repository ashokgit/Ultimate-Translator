const { expect } = require("chai");
const sinon = require("sinon");
const TranslatedPage = require("../models/TranslatedPage");
const SourceCompareService = require("../services/SourceCompareService");
const { validateSourceChange } = require("../validations/changeSourceValidate");
const { changeSource } = require("../controllers/SourceController");

describe("update-source Endpoint", () => {
  describe("Validation Middleware", () => {
    it("should return 422 if required fields are missing", () => {
      const req = {
        body: {},
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      validateSourceChange(req, res, () => {});

      expect(res.status.calledWith(422)).to.be.true;
      expect(res.json.calledWith({ error: '"content_id" is required' })).to.be
        .true;
    });

    it("should call the next middleware if validation passes", () => {
      const req = {
        body: {
          content_id: "123",
          model_name: "YourModel",
          updatedJson: '{"title": "Updated Title"}',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      const nextMiddleware = sinon.spy();

      validateSourceChange(req, res, nextMiddleware);

      expect(nextMiddleware.calledOnce).to.be.true;
    });
  });

  describe("Controller", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should update the source data and return the updated TranslatedPage", async () => {
      const req = {
        body: {
          content_id: "123",
          model_name: "YourModel",
          updatedJson: '{"title": "Updated Title"}',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      const existingTranslatedPage = {
        content_id: "123",
        model_name: "YourModel",
        source_data: { title: "Original Title" },
        translations: [{ en: { title: "Original Title" } }],
        save: sinon.stub().resolves(),
      };

      sinon.stub(TranslatedPage, "findOne").returns(existingTranslatedPage);

      const compareAndUpdateStub = sinon.stub(
        SourceCompareService.prototype,
        "compareAndUpdate"
      );

      await changeSource(req, res);

      expect(compareAndUpdateStub.calledOnce).to.be.true;
      expect(existingTranslatedPage.save.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(
        res.json.calledWith({
          success: true,
          data: existingTranslatedPage,
        })
      ).to.be.true;
    });

    it("should return 404 if the translation is not found", async () => {
      const req = {
        body: {
          content_id: "123",
          model_name: "YourModel",
          updatedJson: '{"title": "Updated Title"}',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      sinon.stub(TranslatedPage, "findOne").returns(null);

      await changeSource(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(
        res.json.calledWith({ success: false, error: "Translation not found" })
      ).to.be.true;
    });

    it("should handle errors and return 500 if failed to update translation", async () => {
      const req = {
        body: {
          content_id: "123",
          model_name: "YourModel",
          updatedJson: '{"title": "Updated Title"}',
        },
      };

      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      sinon.stub(TranslatedPage, "findOne").throws(new Error("Database error"));

      await changeSource(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(
        res.json.calledWith({
          success: false,
          error: "Failed to update translation",
        })
      ).to.be.true;
    });
  });
});
