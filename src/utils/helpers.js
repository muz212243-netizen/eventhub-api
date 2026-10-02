const nextId = (arr) => arr.reduce((max, x) => Math.max(max, x.id), 0) + 1;

const safeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const messages = {
  "any.required": "{{#label}} majburiy",
  "any.only": "{{#label}} ruxsat etilgan qiymatlardan biri bo'lishi kerak",
  "string.base": "{{#label}} matn bo'lishi kerak",
  "string.empty": "{{#label}} bo'sh bo'lmasligi kerak",
  "string.min": "{{#label}} kamida {{#limit}} belgi bo'lishi kerak",
  "string.max": "{{#label}} ko'pi bilan {{#limit}} belgi bo'lishi kerak",
  "string.email": "Email noto'g'ri formatda",
  "string.pattern.base": "{{#label}} noto'g'ri formatda",
  "number.base": "{{#label}} son bo'lishi kerak",
  "number.integer": "{{#label}} butun son bo'lishi kerak",
  "number.positive": "{{#label}} musbat son bo'lishi kerak",
  "number.min": "{{#label}} kamida {{#limit}} bo'lishi kerak",
  "number.max": "{{#label}} ko'pi bilan {{#limit}} bo'lishi kerak",
  "boolean.base": "{{#label}} true yoki false bo'lishi kerak",
  "date.base": "{{#label}} to'g'ri sana emas",
  "date.format": "{{#label}} ISO formatdagi sana bo'lishi kerak",
  "date.greater": "{{#label}} kelajakda bo'lishi kerak",
  "object.min": "Kamida bitta maydon yuborilishi kerak",
};

// Joi bilan tekshiradi. Xato bo'lsa 400 yuboradi va null qaytaradi.
function validate(schema, data, res) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    messages,
    errors: { wrap: { label: false } },
  });
  if (!error) return value;
  res.status(400).json({
    success: false,
    message: "Validatsiya xatosi",
    errors: error.details.map((d) => ({ field: d.path[0], message: d.message })),
  });
  return null;
}

function paginate(items, page, limit) {
  const total = items.length;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Kutilmagan xatolarni ushlaydi (500, stack trace ko'rsatilmaydi)
const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) fail(res, 500, "Serverda kutilmagan xato yuz berdi");
  }
};

module.exports = { nextId, safeUser, ok, fail, validate, paginate, asyncHandler };
