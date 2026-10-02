const Joi = require("joi");

const id = () => Joi.number().integer().positive();
const seats = () => Joi.number().integer().min(1).max(5);

const createBookingSchema = Joi.object({
  user_id: id().required(),
  event_id: id().required(),
  seats: seats().required(),
});

const updateBookingSchema = Joi.object({ seats: seats().required() });

const listBookingsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid("confirmed", "cancelled"),
  event_id: id(),
});

module.exports = { createBookingSchema, updateBookingSchema, listBookingsQuerySchema };
