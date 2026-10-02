const bcrypt = require("bcrypt");
const { readData, writeData } = require("../utils/fileDb");
const { generateOtp } = require("../utils/generateCode");
const { sendMail } = require("../utils/mailer");
const T = require("../utils/emailTemplates");
const { nextId, safeUser, ok, fail, validate, asyncHandler } = require("../utils/helpers");
const {
  registerSchema,
  verifyEmailSchema,
  emailOnlySchema,
  loginSchema,
  resetPasswordSchema,
} = require("../validations/auth.validation");

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Yangi kod yaratadi (eski ishlatilmaganlari used=true bo'ladi), oddiy ko'rinishdagi kodni qaytaradi
async function issueCode(user, purpose) {
  const codes = await readData("codes");
  codes.forEach((c) => {
    if (c.user_id === user.id && c.purpose === purpose && !c.used) c.used = true;
  });
  const plain = generateOtp();
  const now = Date.now();
  codes.push({
    id: nextId(codes),
    user_id: user.id,
    code: await bcrypt.hash(plain, 10),
    purpose,
    attempts: 0,
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
    used: false,
    created_at: new Date(now).toISOString(),
  });
  await writeData("codes", codes);
  return plain;
}

// Kodni tekshiradi. Xato bo'lsa { error }, to'g'ri bo'lsa { codes, record } qaytaradi
async function checkCode(userId, purpose, plain) {
  const codes = await readData("codes");
  const record = codes
    .filter((c) => c.user_id === userId && c.purpose === purpose && !c.used)
    .sort((a, b) => b.id - a.id)[0];

  if (!record) return { error: "Faol kod topilmadi. Yangi kod so'rang" };
  if (new Date(record.expires_at) < new Date()) return { error: "Kod muddati tugagan" };
  if (record.attempts >= MAX_ATTEMPTS) return { error: "Urinishlar soni tugadi. Yangi kod so'rang" };

  if (!(await bcrypt.compare(plain, record.code))) {
    record.attempts += 1;
    await writeData("codes", codes);
    return { error: "Kod noto'g'ri" };
  }
  return { codes, record };
}

exports.register = asyncHandler(async (req, res) => {
  const value = validate(registerSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  if (users.some((u) => u.email === value.email)) {
    return fail(res, 409, "Bu email allaqachon ro'yxatdan o'tgan");
  }

  const user = {
    id: nextId(users),
    full_name: value.full_name,
    email: value.email,
    password: await bcrypt.hash(value.password, 10),
    is_verified: false,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  await writeData("users", users);

  const code = await issueCode(user, "verify_email");
  await sendMail({ to: user.email, ...T.verifyCode(user.full_name, code) });

  ok(res, "Ro'yxatdan o'tdingiz. Emailingizga tasdiqlash kodi yuborildi", safeUser(user), 201);
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const value = validate(verifyEmailSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.email === value.email);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");
  if (user.is_verified) return fail(res, 400, "Email allaqachon tasdiqlangan");

  const result = await checkCode(user.id, "verify_email", value.code);
  if (result.error) return fail(res, 400, result.error);

  result.record.used = true;
  user.is_verified = true;
  await writeData("codes", result.codes);
  await writeData("users", users);

  await sendMail({ to: user.email, ...T.welcome(user.full_name) });
  ok(res, "Email tasdiqlandi", safeUser(user));
});

exports.resendCode = asyncHandler(async (req, res) => {
  const value = validate(emailOnlySchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.email === value.email);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");
  if (user.is_verified) return fail(res, 400, "Email allaqachon tasdiqlangan");

  const codes = await readData("codes");
  const last = codes
    .filter((c) => c.user_id === user.id && c.purpose === "verify_email")
    .sort((a, b) => b.id - a.id)[0];
  if (last && Date.now() - new Date(last.created_at).getTime() < RESEND_WAIT_MS) {
    return fail(res, 429, "Iltimos, 60 soniyadan keyin urinib ko'ring");
  }

  const code = await issueCode(user, "verify_email");
  await sendMail({ to: user.email, ...T.verifyCode(user.full_name, code) });
  ok(res, "Yangi kod emailingizga yuborildi", null);
});

exports.login = asyncHandler(async (req, res) => {
  const value = validate(loginSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.email === value.email);
  if (!user || !(await bcrypt.compare(value.password, user.password))) {
    return fail(res, 401, "Email yoki parol noto'g'ri");
  }
  if (!user.is_verified) return fail(res, 403, "Avval emailingizni tasdiqlang");

  ok(res, "Muvaffaqiyatli kirdingiz", safeUser(user));
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const value = validate(emailOnlySchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.email === value.email);
  if (user) {
    const code = await issueCode(user, "reset_password");
    await sendMail({ to: user.email, ...T.resetCode(user.full_name, code) });
  }
  // Email bor-yo'qligidan qat'i nazar bir xil javob
  ok(res, "Agar bu email ro'yxatdan o'tgan bo'lsa, unga kod yuborildi", null);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const value = validate(resetPasswordSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.email === value.email);
  if (!user) return fail(res, 400, "Kod noto'g'ri yoki muddati tugagan");

  const result = await checkCode(user.id, "reset_password", value.code);
  if (result.error) return fail(res, 400, result.error);

  result.record.used = true;
  user.password = await bcrypt.hash(value.new_password, 10);
  await writeData("codes", result.codes);
  await writeData("users", users);

  await sendMail({ to: user.email, ...T.passwordChanged(user.full_name) });
  ok(res, "Parol muvaffaqiyatli yangilandi", null);
});
