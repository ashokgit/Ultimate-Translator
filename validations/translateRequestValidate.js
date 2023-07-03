const Joi = require("joi");

const translateRequestValidate = Joi.object({
  language: Joi.string().required(),
  model_name: Joi.string().required(),
  id: Joi.string().required(),
  source_url: Joi.string().required(),
});

module.exports = {
  translateRequestValidate,
};
