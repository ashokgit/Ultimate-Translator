const Joi = require("joi");

const validateStringTranslation = (req, res, next) => {
  const schema = Joi.object({
    language: Joi.required(),
    text: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(422).json({ error: error.details[0].message });
  }

  next();
};

module.exports = { validateStringTranslation };
