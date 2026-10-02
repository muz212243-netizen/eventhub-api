const bcrypt = require("bcrypt");
const { readData, writeData } = require("../utils/fileDb");
const { sendMail } = require("../utils/mailer");
const T = require("../utils/emailTemplates");
const { safeUser, ok, fail, validate, asyncHandler } = require("../utils/helpers");
const { idParamSchema } = require("../validations/common.validation");
const {
  updateUserSchema,
  changePasswordSchema,
  deleteUserSchema,
} = require("../validations/auth.validation");

exports.getUser = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const users = await readData("users");
  const user = users.find((u) => u.id === params.id);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");

  const bookings = await readData("bookings");
  const activeBookings = bookings.filter((b) => b.user_id === user.id && b.status === "confirmed").length;

  ok(res, "Foydalanuvchi ma'lumotlari", { ...safeUser(user), activeBookings });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;
  const value = validate(updateUserSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.id === params.id);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");

  user.full_name = value.full_name;
  await writeData("users", users);
  ok(res, "Profil yangilandi", safeUser(user));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;
  const value = validate(changePasswordSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.id === params.id);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");

  if (!(await bcrypt.compare(value.old_password, user.password))) {
    return fail(res, 400, "Eski parol noto'g'ri");
  }
  if (await bcrypt.compare(value.new_password, user.password)) {
    return fail(res, 400, "Yangi parol eskisi bilan bir xil bo'lmasligi kerak");
  }

  user.password = await bcrypt.hash(value.new_password, 10);
  await writeData("users", users);
  await sendMail({ to: user.email, ...T.passwordChanged(user.full_name) });
  ok(res, "Parol o'zgartirildi", null);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;
  const value = validate(deleteUserSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.id === params.id);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");

  if (!(await bcrypt.compare(value.password, user.password))) {
    return fail(res, 400, "Parol noto'g'ri");
  }

  // Faol bronlarni bekor qilib, joylarni qaytaramiz
  const bookings = await readData("bookings");
  const events = await readData("events");
  let cancelled = 0;
  bookings.forEach((b) => {
    if (b.user_id === user.id && b.status === "confirmed") {
      b.status = "cancelled";
      cancelled += 1;
      const event = events.find((e) => e.id === b.event_id);
      if (event) event.available_seats = Math.min(event.capacity, event.available_seats + b.seats);
    }
  });

  const codes = (await readData("codes")).filter((c) => c.user_id !== user.id);

  await writeData("events", events);
  await writeData("bookings", bookings);
  await writeData("codes", codes);
  await writeData("users", users.filter((u) => u.id !== user.id));

  ok(res, "Akkaunt o'chirildi", { cancelledBookings: cancelled });
});
