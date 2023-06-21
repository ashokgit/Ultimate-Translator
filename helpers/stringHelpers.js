const isURL = (str) => {
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  return urlRegex.test(str);
};

module.exports = {
  isURL,
};
