const chai = require("chai");
const sinon = require("sinon");
const TranslatedPage = require("../models/TranslatedPage");
const getAvailableLanguages = require("../services/AvailableLanguageFilterService");

const expect = chai.expect;

describe("getAvailableLanguages", () => {
  let findOneStub;

  beforeEach(() => {
    findOneStub = sinon.stub(TranslatedPage, "findOne");
  });

  afterEach(() => {
    findOneStub.restore();
  });

  it("should return available languages with URLs for a valid content_id and source_url", async () => {
    const existingTranslatedPage = {
      translations: [
        { en: { url: "/en" } },
        { fr: { url: "/fr" } },
        { es: { url: "/es" } },
      ],
    };
    const req = { query: { content_id: "123", source_url: "/example" } };

    findOneStub.resolves(existingTranslatedPage);

    const filterResponse = await getAvailableLanguages(req);

    expect(filterResponse.success).to.be.true;
    expect(filterResponse.data).to.deep.equal([
      { language: "en", url: "/en" },
      { language: "fr", url: "/fr" },
      { language: "es", url: "/es" },
    ]);
    expect(
      findOneStub.calledOnceWithExactly({
        content_id: "123",
        source_url: "/example",
      })
    ).to.be.true;
  });

  it("should return error if translations are not found", async () => {
    const req = { query: { content_id: "123", source_url: "/example" } };

    findOneStub.resolves(null);

    const filterResponse = await getAvailableLanguages(req);

    expect(filterResponse.success).to.be.false;
    expect(filterResponse.error).to.equal("Translations not found.");
    expect(
      findOneStub.calledOnceWithExactly({
        content_id: "123",
        source_url: "/example",
      })
    ).to.be.true;
  });

  it("should return empty array if translations do not have URLs", async () => {
    const existingTranslatedPage = {
      translations: [
        { en: { title: "English Title" } },
        { fr: { title: "French Title" } },
        { es: { title: "Spanish Title" } },
      ],
    };
    const req = { query: { content_id: "123", source_url: "/example" } };

    findOneStub.resolves(existingTranslatedPage);

    const filterResponse = await getAvailableLanguages(req);

    expect(filterResponse.success).to.be.true;
    expect(filterResponse.data).to.deep.equal([
      { language: "en", url: "" },
      { language: "fr", url: "" },
      { language: "es", url: "" },
    ]);
    expect(
      findOneStub.calledOnceWithExactly({
        content_id: "123",
        source_url: "/example",
      })
    ).to.be.true;
  });

  it("should return error if an exception occurs", async () => {
    const req = { query: { content_id: "123", source_url: "/example" } };

    findOneStub.rejects(new Error("Database error"));

    const filterResponse = await getAvailableLanguages(req);

    expect(filterResponse.success).to.be.false;
    expect(filterResponse.error).to.equal("Database error");
    expect(
      findOneStub.calledOnceWithExactly({
        content_id: "123",
        source_url: "/example",
      })
    ).to.be.true;
  });
});
