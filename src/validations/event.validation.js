const Joi = require("joi");

const CATEGORIES = ["concert", "meetup", "standup", "workshop", "sport", "other"];

const createEventSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150).required(),
  description: Joi.string().trim().max(2000).allow(""),
  category: Joi.string().valid(...CATEGORIES).required(),
  city: Joi.string().trim().min(2).max(50).required(),
  venue: Joi.string().trim().min(3).max(150).required(),
  starts_at: Joi.date().iso().greater("now").required(),
  price: Joi.number().integer().min(0).max(10000000).required(),
  capacity: Joi.number().integer().min(1).max(10000).required(),
});

// Barcha maydonlar ixtiyoriy, lekin kamida bittasi kerak
const updateEventSchema = createEventSchema
  .fork(["title", "category", "city", "venue", "starts_at", "price", "capacity"], (s) => s.optional())
  .min(1);

const listEventsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().allow(""),
  category: Joi.string().valid(...CATEGORIES),
  city: Joi.string().trim(),
  free: Joi.boolean(),
  all: Joi.boolean().default(false),
  sort: Joi.string().valid("date_asc", "date_desc", "price_asc", "price_desc").default("date_asc"),
});

module.exports = { createEventSchema, updateEventSchema, listEventsQuerySchema };
