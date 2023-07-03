const isURL = (str) => {
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  return urlRegex.test(str);
};

const makeSlug = (str) => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
};

module.exports = {
  isURL,
  makeSlug,
};
