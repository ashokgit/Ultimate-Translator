const chai = require("chai");
const axios = require("axios");
const sinon = require("sinon");
const JsonFetcherService = require("../services/JsonFetcherService");

const expect = chai.expect;

describe("JsonFetcherService", function () {
  this.timeout(10000);

  describe("fetchData", function () {
    it("should fetch data from the source URL successfully", async () => {
      const sourceUrl = "https://dummyjson.com/products/14";

      const jsonFetcherService = new JsonFetcherService();
      const fetchedData = await jsonFetcherService.fetchData(sourceUrl);

      expect(fetchedData).to.be.an("object").that.is.not.empty;
    });

    it("should handle errors and throw an error message", async () => {
      const sourceUrl = "https://dummyjson.com/nonexistent-url";

      const jsonFetcherService = new JsonFetcherService();

      try {
        await jsonFetcherService.fetchData(sourceUrl);
        // If the above line does not throw an error, fail the test
        expect.fail("Expected an error to be thrown");
      } catch (error) {
        expect(error.message).to.equal("Failed to fetch data from source URL");
      }
    });
  });
});
