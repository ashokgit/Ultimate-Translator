const chai = require("chai");
const expect = chai.expect;
const mongoose = require("mongoose");
const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const logger = require("../utils/logger");

// Disable logger for tests
logger.silent = true;

describe("API Key Encryption and Decryption", () => {
  before(async () => {
    // Use an in-memory MongoDB server for testing
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // Set a consistent encryption key for the test environment
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  });

  after(async () => {
    await mongoose.disconnect();
    delete process.env.ENCRYPTION_KEY;
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await ApiKey.deleteMany({});
  });

  it("should encrypt the API key on save and decrypt it correctly", async () => {
    const originalApiKey = "test-api-key-12345";
    const apiKeyData = {
      provider: "openai",
      name: "Test Key",
      encryptedKey: originalApiKey,
    };

    // Create and save the API key
    const newApiKey = new ApiKey(apiKeyData);
    await newApiKey.save();

    // Ensure the key in the database is not the original key
    expect(newApiKey.encryptedKey).to.not.equal(originalApiKey);
    expect(newApiKey.encryptedKey).to.be.a('string');

    // Retrieve the key from the database
    const foundKey = await ApiKey.findById(newApiKey._id);
    expect(foundKey).to.not.be.null;

    // Decrypt the key
    const decryptedKey = foundKey.decryptKey();

    // Verify that the decrypted key matches the original
    expect(decryptedKey).to.equal(originalApiKey);
  });

  it("should not re-encrypt an already encrypted key if not modified", async () => {
    const originalApiKey = "another-test-key-67890";
    const apiKeyData = {
      provider: "google",
      name: "Another Test Key",
      encryptedKey: originalApiKey,
    };

    const newApiKey = new ApiKey(apiKeyData);
    await newApiKey.save();

    const firstEncryptedValue = newApiKey.encryptedKey;

    // Save the document again without modifying the key
    newApiKey.name = "Updated Test Key Name";
    await newApiKey.save();

    const updatedKey = await ApiKey.findById(newApiKey._id);

    // The encrypted key should NOT have changed
    expect(updatedKey.encryptedKey).to.equal(firstEncryptedValue);

    const decryptedKey = updatedKey.decryptKey();
    expect(decryptedKey).to.equal(originalApiKey);
  });
  
  it('should handle decryption of a key that was not encrypted with the new IV format', async () => {
    const oldFormatKey = "unencrypted-or-old-format-key";
    
    // Manually insert a key that does not have the "iv:encrypted_text" format
    const key = new ApiKey({
        provider: 'custom',
        name: 'Old Key',
        encryptedKey: oldFormatKey,
    });
    await key.save();
    
    // Manually override the encrypted value to simulate an old key format
    await ApiKey.updateOne({ _id: key._id }, { $set: { encryptedKey: oldFormatKey } });

    const foundKey = await ApiKey.findById(key._id);
    const decryptedKey = foundKey.decryptKey();

    // The key should be returned as-is because it can't be decrypted
    expect(decryptedKey).to.equal(oldFormatKey);
  });
}); 