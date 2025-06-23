const Joi = require("joi");

const validateDeleteTranslation = (req, res, next) => {
  const schema = Joi.object({
    content_id: Joi.string().required(),
    model_name: Joi.string().required(),
    language: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(422).json({ 
      success: false,
      error: error.details[0].message 
    });
  }

  next();
};

module.exports = { validateDeleteTranslation }; 