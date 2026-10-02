const Joi = require("joi");

const idParamSchema = Joi.object({ id: Joi.number().integer().positive().required() });

module.exports = { idParamSchema };
