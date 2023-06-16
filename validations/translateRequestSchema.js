const Joi = require("joi");

const translateRequestSchema = Joi.object({
  language: Joi.string().required(),
  model_name: Joi.string().required(),
  id: Joi.string().required(),
  source_url: Joi.string().required(),
});

module.exports = {
  translateRequestSchema,
};
