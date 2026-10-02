const Joi = require("joi");

const password = () =>
  Joi.string()
    .min(8)
    .max(64)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .messages({ "string.pattern.base": "Parol kamida 1 ta katta harf, 1 ta kichik harf va 1 ta raqamdan iborat bo'lishi kerak" });

const email = () => Joi.string().trim().lowercase().email().required();
const code = () => Joi.string().trim().pattern(/^\d{6}$/).required().messages({ "string.pattern.base": "Kod 6 xonali raqam bo'lishi kerak" });

const registerSchema = Joi.object({
  full_name: Joi.string().trim().min(3).max(100).required(),
  email: email(),
  password: password().required(),
});

const verifyEmailSchema = Joi.object({ email: email(), code: code() });
const emailOnlySchema = Joi.object({ email: email() });
const loginSchema = Joi.object({ email: email(), password: Joi.string().required() });
const resetPasswordSchema = Joi.object({ email: email(), code: code(), new_password: password().required() });

const updateUserSchema = Joi.object({ full_name: Joi.string().trim().min(3).max(100).required() });
const changePasswordSchema = Joi.object({
  old_password: Joi.string().required(),
  new_password: password().required(),
});
const deleteUserSchema = Joi.object({ password: Joi.string().required() });

module.exports = {
  registerSchema,
  verifyEmailSchema,
  emailOnlySchema,
  loginSchema,
  resetPasswordSchema,
  updateUserSchema,
  changePasswordSchema,
  deleteUserSchema,
};
