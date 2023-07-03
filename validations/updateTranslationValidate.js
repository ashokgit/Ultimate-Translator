const Joi = require("joi");

const validateUpdateTranslation = (req, res, next) => {
  const schema = Joi.object({
    content_id: Joi.required(),
    model_name: Joi.string().required(),
    language: Joi.string().required(),
    updatedJson: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(422).json({ error: error.details[0].message });
  }

  next();
};

module.exports = { validateUpdateTranslation };
