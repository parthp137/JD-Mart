const { ValidationError } = require('../utils/AppError');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const messages = error.details.map((detail) => detail.message).join(', ');
      // If we are dealing with forms/redirects, we might want to flash and redirect.
      // But for an API or generic error handler:
      return next(new ValidationError(messages));
    }
    next();
  };
};

module.exports = validate;
