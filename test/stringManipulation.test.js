const assert = require("assert");

describe("String Manipulation", () => {
  describe("toUpperCase", () => {
    it("should convert all characters to uppercase", () => {
      const result = "hello".toUpperCase();
      assert.strictEqual(result, "HELLO");
    });

    it("should return an empty string if input is empty", () => {
      const result = "".toUpperCase();
      assert.strictEqual(result, "");
    });

    it("should not modify the string if it already contains all uppercase characters", () => {
      const result = "HELLO".toUpperCase();
      assert.strictEqual(result, "HELLO");
    });
  });

  describe("split and reverse", () => {
    it("should split the string, reverse the elements, and join them back", () => {
      const result = "hello world".split(" ").reverse().join(" ");
      assert.strictEqual(result, "world hello");
    });

    it("should return an empty string if input is empty", () => {
      const result = "".split(" ").reverse().join(" ");
      assert.strictEqual(result, "");
    });

    it("should return the same string if it contains only one word", () => {
      const result = "hello".split(" ").reverse().join(" ");
      assert.strictEqual(result, "hello");
    });
  });
});
