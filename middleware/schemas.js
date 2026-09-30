const Joi = require('joi');

const cartAddSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required()
});

const cartUpdateSchema = Joi.object({
  quantity: Joi.number().integer().min(0).required()
});

module.exports = {
  cartAddSchema,
  cartUpdateSchema
};
