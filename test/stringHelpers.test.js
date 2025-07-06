const { expect } = require('chai');
const sinon = require('sinon');
const {
  shouldTranslate,
  tokenizeString,
  detokenizeString,
} = require('../helpers/stringHelpers');
const TranslationConfigService = require('../services/TranslationConfigService');

describe('stringHelpers', () => {
  describe('shouldTranslate', () => {
    let configServiceStub;

    beforeEach(() => {
      configServiceStub = sinon.stub(TranslationConfigService.prototype, 'shouldTranslateKey').resolves(true);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return true for strings with ICU/Handlebars/React-intl placeholders', async () => {
      expect(await shouldTranslate("Hello {{name}}")).to.be.true;
      expect(await shouldTranslate("You have {count} new messages")).to.be.true;
      expect(await shouldTranslate("Progress: %percentage% complete")).to.be.true;
    });

    // Add more tests for shouldTranslate as needed...
  });

  describe('tokenizeString', () => {
    it('should correctly tokenize a string with various placeholders', () => {
      const str = "Welcome {{user.name}} to %location%. You have {unread_count} messages.";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // Based on reverse order of replacement: {unread_count} -> TOKEN_0, %location% -> TOKEN_1, {{user.name}} -> TOKEN_2
      expect(tokenizedString).to.equal("Welcome TOKEN_2 to TOKEN_1. You have TOKEN_0 messages.");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "{unread_count}",
        "TOKEN_1": "%location%",
        "TOKEN_2": "{{user.name}}"
      });
    });

    it('should handle strings with no placeholders or HTML tags', () => {
      const str = "A string without any special items.";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      expect(tokenizedString).to.equal(str);
      expect(tokenMap).to.deep.equal({});
    });

    it('should tokenize multiple identical placeholders/tags with the same token', () => {
      const str = "Hello {name}, how is {name} doing? Click <a href='#'>here</a> or <a href='#'>there</a>.";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // <a href='#'> (last one) -> TOKEN_0
      // <a href='#'> (first one) -> TOKEN_0 (already mapped)
      // {name} (last one) -> TOKEN_1
      // {name} (first one) -> TOKEN_1 (already mapped)
      expect(tokenizedString).to.equal("Hello TOKEN_1, how is TOKEN_1 doing? Click TOKEN_0 or TOKEN_0.");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "<a href='#'>",
        "TOKEN_1": "{name}"
      });
    });

    it('should correctly tokenize HTML tags alongside placeholders', () => {
      const str = "<p>Hello {{name}}!</p> You have <strong>{count}</strong> messages.";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // Trace:
      // 1. </strong> -> TOKEN_0
      // 2. {count} -> TOKEN_1
      // 3. <strong> -> TOKEN_2
      // 4. </p> -> TOKEN_3
      // 5. {{name}} -> TOKEN_4
      // 6. <p> -> TOKEN_5
      // Result: TOKEN_5Hello TOKEN_4!TOKEN_3 You have TOKEN_2TOKEN_1TOKEN_0 messages.
      expect(tokenizedString).to.equal("TOKEN_5Hello TOKEN_4!TOKEN_3 You have TOKEN_2TOKEN_1TOKEN_0 messages.");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "</strong>",
        "TOKEN_1": "{count}",
        "TOKEN_2": "<strong>",
        "TOKEN_3": "</p>",
        "TOKEN_4": "{{name}}",
        "TOKEN_5": "<p>"
      });
    });

    it('should ignore escaped placeholders and not tokenize them', () => {
      const str = "This is \\{{name}} not a placeholder, but {{real_name}} is. Also \\%var and \\{id}. Check <p>\\<strong>tag\\</strong></p>";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // Only {{real_name}}, <p>, </p> should be tokenized.
      // </p> -> TOKEN_0
      // <p> -> TOKEN_1
      // {{real_name}} -> TOKEN_2
      // Result: "This is \\{{name}} not a placeholder, but TOKEN_2 is. Also \\%var and \\{id}. Check TOKEN_1\\<strong>tag\\</strong>TOKEN_0"
      expect(tokenizedString).to.equal("This is \\{{name}} not a placeholder, but TOKEN_2 is. Also \\%var and \\{id}. Check TOKEN_1\\<strong>tag\\</strong>TOKEN_0");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "</p>",
        "TOKEN_1": "<p>",
        "TOKEN_2": "{{real_name}}"
      });
    });

    it('should handle simple nested placeholders by tokenizing iteratively', () => {
      const str = "Data: {{outer_{{inner_val}}-foo}}";
      // Trace:
      // 1. {{inner_val}} -> TOKEN_0. String becomes "Data: {{outer_TOKEN_0-foo}}"
      // 2. {{outer_TOKEN_0-foo}} -> TOKEN_1. String becomes "Data: TOKEN_1"
      const { tokenizedString, tokenMap } = tokenizeString(str);
      expect(tokenizedString).to.equal("Data: TOKEN_1");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "{{inner_val}}",
        "TOKEN_1": "{{outer_TOKEN_0-foo}}"
      });
    });

    it('should tokenize placeholders with dots and hyphens in names', () => {
      const str = "User: {{user.profile-name}}, ID: {item-id-123}";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // {item-id-123} -> TOKEN_0
      // {{user.profile-name}} -> TOKEN_1
      expect(tokenizedString).to.equal("User: TOKEN_1, ID: TOKEN_0");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "{item-id-123}",
        "TOKEN_1": "{{user.profile-name}}"
      });
    });

    it('should correctly tokenize complex HTML tags with various attributes', () => {
      const str = "<div class='container' data-id=\"main\">Content with <img src='image.png' alt='An image' style=\"width:100%\"/></div>";
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // </div> -> TOKEN_0
      // <img ... /> -> TOKEN_1
      // <div ... > -> TOKEN_2
      expect(tokenizedString).to.equal("TOKEN_2Content with TOKEN_1TOKEN_0");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "</div>",
        "TOKEN_1": "<img src='image.png' alt='An image' style=\"width:100%\"/>",
        "TOKEN_2": "<div class='container' data-id=\"main\">"
      });
    });

    it('should tokenize adjacent placeholders and tags correctly', () => {
      const str = "{{greeting}}<strong>{username}</strong>";
      // </strong> -> TOKEN_0
      // {username} -> TOKEN_1
      // <strong> -> TOKEN_2
      // {{greeting}} -> TOKEN_3
      const { tokenizedString, tokenMap } = tokenizeString(str);
      expect(tokenizedString).to.equal("TOKEN_3TOKEN_2TOKEN_1TOKEN_0");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "</strong>",
        "TOKEN_1": "{username}",
        "TOKEN_2": "<strong>",
        "TOKEN_3": "{{greeting}}"
      });
    });

    it('should handle placeholder-like text within HTML attributes if not explicitly matched by placeholder regex', () => {
      const str = "<div data-config=\"{type: 'user'}\">Text</div>"; // {type: 'user'} is not a placeholder we defined
      const { tokenizedString, tokenMap } = tokenizeString(str);
      // </div> -> TOKEN_0
      // <div ...> -> TOKEN_1
      expect(tokenizedString).to.equal("TOKEN_1TextTOKEN_0");
      expect(tokenMap).to.deep.equal({
        "TOKEN_0": "</div>",
        "TOKEN_1": "<div data-config=\"{type: 'user'}\">"
      });
    });

    it('should tokenize a placeholder within an HTML attribute value', () => {
        const str = "<a href=\"/base/{{path_segment}}/details\">Click</a>";
        // {{path_segment}} -> TOKEN_0
        // </a> -> TOKEN_1
        // <a href="/base/TOKEN_0/details"> -> TOKEN_2
        const { tokenizedString, tokenMap } = tokenizeString(str);
        expect(tokenizedString).to.equal("TOKEN_2ClickTOKEN_1");
        expect(tokenMap).to.deep.equal({
          "TOKEN_0": "{{path_segment}}",
          "TOKEN_1": "</a>",
          "TOKEN_2": "<a href=\"/base/TOKEN_0/details\">"
        });
    });

  });

  describe('detokenizeString', () => {
    it('should correctly detokenize a string with various placeholders and HTML', () => {
      const tokenizedStr = "TOKEN_5Hello TOKEN_4!TOKEN_3 You have TOKEN_2TOKEN_1TOKEN_0 messages.";
      const tokenMap = {
        "TOKEN_0": "</strong>",
        "TOKEN_1": "{count}",
        "TOKEN_2": "<strong>",
        "TOKEN_3": "</p>",
        "TOKEN_4": "{{name}}",
        "TOKEN_5": "<p>"
      };
      const result = detokenizeString(tokenizedStr, tokenMap);
      expect(result).to.equal("<p>Hello {{name}}!</p> You have <strong>{count}</strong> messages.");
    });

    it('should correctly detokenize iteratively tokenized nested placeholders', () => {
      const tokenizedStr = "Data: TOKEN_1";
      const tokenMap = {
        "TOKEN_0": "{{inner_val}}",
        "TOKEN_1": "{{outer_TOKEN_0-foo}}"
      };
      // First pass: "Data: {{outer_TOKEN_0-foo}}"
      // Second pass (conceptually, if detokenizeString was recursive, but it's one pass):
      // It replaces TOKEN_1 with {{outer_TOKEN_0-foo}}.
      // Then it replaces TOKEN_0 in that result with {{inner_val}}.
      const result = detokenizeString(tokenizedStr, tokenMap);
      expect(result).to.equal("Data: {{outer_{{inner_val}}-foo}}");
    });

    it('should return the string as is if no tokens from the map are in the string', () => {
      const tokenizedStr = "A string without actual tokens from map.";
      const tokenMap = { "TOKEN_XYZ": "{value}" };
      const result = detokenizeString(tokenizedStr, tokenMap);
      expect(result).to.equal(tokenizedStr);
    });

    it('should handle detokenizing with an empty map', () => {
      const tokenizedStr = "String with TOKEN_0 but empty map."; // TOKEN_0 won't be replaced
      const tokenMap = {};
      const result = detokenizeString(tokenizedStr, tokenMap);
      expect(result).to.equal("String with TOKEN_0 but empty map.");
    });

    it('should correctly restore escaped placeholders if they were preserved in tokenized string', () => {
      const tokenizedResultFromTest = "This is \\{{name}} not a placeholder, but TOKEN_2 is. Also \\%var and \\{id}. Check TOKEN_1\\<strong>tag\\</strong>TOKEN_0";
      const mapFromResultTest = {
        "TOKEN_0": "</p>",
        "TOKEN_1": "<p>",
        "TOKEN_2": "{{real_name}}"
      };
      const result = detokenizeString(tokenizedResultFromTest, mapFromResultTest);
      expect(result).to.equal("This is \\{{name}} not a placeholder, but {{real_name}} is. Also \\%var and \\{id}. Check <p>\\<strong>tag\\</strong></p>");
    });
  });
});
