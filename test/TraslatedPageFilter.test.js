const chai = require("chai");
const sinon = require("sinon");
const TranslatedPage = require("../../models/TranslatedPage");
const filterTranslation = require("../../services/FilterTranslationService");

const expect = chai.expect;

describe("FilterTranslationService", () => {
  let findStub, countDocumentsStub;

  beforeEach(() => {
    findStub = sinon.stub(TranslatedPage, "find");
    countDocumentsStub = sinon.stub(TranslatedPage, "countDocuments");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return filtered and paginated translation data", async () => {
    const language = "fr";
    const contentId = "1";
    const modelName = "blog";
    const mockTranslatedPage = {
      content_id: contentId,
      model_name: modelName,
      translations: [{ fr: "French Translation" }],
    };

    const findQuery = {
      sort: sinon.stub().returnsThis(),
      skip: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      lean: sinon.stub().resolves([mockTranslatedPage]),
    };
    findStub.returns(findQuery);
    countDocumentsStub.resolves(1);

    const result = await filterTranslation({
      query: { language, content_id: contentId, model_name: modelName },
    });

    expect(result.success).to.be.true;
    expect(result.data).to.be.an('array').with.lengthOf(1);
    expect(result.data[0]).to.deep.equal(mockTranslatedPage);
    expect(result.pagination.totalCount).to.equal(1);
  });

  it("should return an empty array if no translations are found", async () => {
    const language = "fr";

    const findQuery = {
      sort: sinon.stub().returnsThis(),
      skip: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      lean: sinon.stub().resolves([]),
    };
    findStub.returns(findQuery);
    countDocumentsStub.resolves(0);

    const result = await filterTranslation({ query: { language } });

    expect(result.success).to.be.true;
    expect(result.data).to.be.an('array').that.is.empty;
    expect(result.pagination.totalCount).to.equal(0);
  });

  it("should return all translations if language is not specified", async () => {
    const contentId = "1";
    const mockTranslatedPage = { content_id: contentId, translations: [] };
    
    const findQuery = {
      sort: sinon.stub().returnsThis(),
      skip: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      lean: sinon.stub().resolves([mockTranslatedPage]),
    };
    findStub.returns(findQuery);
    countDocumentsStub.resolves(1);

    const result = await filterTranslation({ query: { content_id: contentId } });

    expect(result.success).to.be.true;
    expect(result.data).to.be.an('array').with.lengthOf(1);
    expect(result.data[0]).to.deep.equal(mockTranslatedPage);
  });

  it("should handle database errors gracefully", async () => {
    const error = new Error("Database error");
    findStub.throws(error);

    const result = await filterTranslation({ query: {} });

    expect(result.success).to.be.false;
    expect(result.error).to.equal("Database error");
  });
});
