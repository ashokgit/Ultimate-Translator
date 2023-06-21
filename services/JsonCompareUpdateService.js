class JsonCompateUpdateService {
  //compate and update
  updateJsonValues(currentJson, updatedJson) {
    for (const key in updatedJson) {
      if (updatedJson.hasOwnProperty(key)) {
        if (
          typeof updatedJson[key] !== "object" ||
          updatedJson[key] === null ||
          Array.isArray(updatedJson[key])
        ) {
          if (
            currentJson.hasOwnProperty(key) &&
            currentJson[key] !== updatedJson[key]
          ) {
            currentJson[key] = updatedJson[key];
          }
        } else {
          if (
            currentJson.hasOwnProperty(key) &&
            typeof currentJson[key] === "object" &&
            currentJson[key] !== null
          ) {
            this.updateJsonValues(currentJson[key], updatedJson[key]);
          }
        }
      }
    }
  }
}

module.exports = JsonCompateUpdateService;
