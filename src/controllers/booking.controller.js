const { readData, writeData } = require("../utils/fileDb");
const { generateTicketCode } = require("../utils/generateCode");
const { sendMail } = require("../utils/mailer");
const T = require("../utils/emailTemplates");
const { nextId, safeUser, ok, fail, validate, paginate, asyncHandler } = require("../utils/helpers");
const { idParamSchema } = require("../validations/common.validation");
const {
  createBookingSchema,
  updateBookingSchema,
  listBookingsQuerySchema,
} = require("../validations/booking.validation");

const DAY_MS = 24 * 60 * 60 * 1000;

exports.createBooking = asyncHandler(async (req, res) => {
  const value = validate(createBookingSchema, req.body, res);
  if (!value) return;

  const users = await readData("users");
  const user = users.find((u) => u.id === value.user_id);
  if (!user) return fail(res, 404, "Foydalanuvchi topilmadi");
  if (!user.is_verified) return fail(res, 403, "Avval emailingizni tasdiqlang");

  const events = await readData("events");
  const event = events.find((e) => e.id === value.event_id);
  if (!event) return fail(res, 404, "Tadbir topilmadi");
  if (new Date(event.starts_at) <= new Date()) return fail(res, 400, "Tadbir allaqachon boshlangan");

  const bookings = await readData("bookings");
  if (bookings.some((b) => b.user_id === user.id && b.event_id === event.id && b.status === "confirmed")) {
    return fail(res, 409, "Siz bu tadbirga allaqachon yozilgansiz");
  }
  if (value.seats > event.available_seats) {
    return fail(res, 400, `Faqat ${event.available_seats} ta joy qoldi`);
  }

  event.available_seats -= value.seats;
  await writeData("events", events);

  const booking = {
    id: nextId(bookings),
    user_id: user.id,
    event_id: event.id,
    seats: value.seats,
    total_price: value.seats * event.price,
    ticket_code: generateTicketCode(bookings.map((b) => b.ticket_code)),
    status: "confirmed",
    created_at: new Date().toISOString(),
  };
  bookings.push(booking);
  await writeData("bookings", bookings);

  await sendMail({ to: user.email, ...T.ticket(user.full_name, event, booking) });
  ok(res, "Bron qilindi. Chipta emailingizga yuborildi", booking, 201);
});

exports.getBookings = asyncHandler(async (req, res) => {
  const q = validate(listBookingsQuerySchema, req.query, res);
  if (!q) return;

  let list = await readData("bookings");
  if (q.status) list = list.filter((b) => b.status === q.status);
  if (q.event_id) list = list.filter((b) => b.event_id === q.event_id);

  const { items, meta } = paginate(list, q.page, q.limit);
  res.status(200).json({ success: true, data: items, meta });
});

exports.getUserBookings = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const users = await readData("users");
  if (!users.some((u) => u.id === params.id)) return fail(res, 404, "Foydalanuvchi topilmadi");

  const events = await readData("events");
  const bookings = (await readData("bookings"))
    .filter((b) => b.user_id === params.id)
    .map((b) => {
      const e = events.find((ev) => ev.id === b.event_id);
      return { ...b, event: e ? { title: e.title, starts_at: e.starts_at, venue: e.venue } : null };
    });

  ok(res, "Foydalanuvchi bronlari", bookings);
});

exports.getBooking = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const booking = (await readData("bookings")).find((b) => b.id === params.id);
  if (!booking) return fail(res, 404, "Bron topilmadi");

  const user = (await readData("users")).find((u) => u.id === booking.user_id);
  const event = (await readData("events")).find((e) => e.id === booking.event_id);

  ok(res, "Bron tafsilotlari", {
    ...booking,
    user: user ? { id: user.id, full_name: user.full_name, email: user.email } : null,
    event: event
      ? { id: event.id, title: event.title, starts_at: event.starts_at, venue: event.venue, city: event.city }
      : null,
  });
});

exports.updateBooking = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;
  const value = validate(updateBookingSchema, req.body, res);
  if (!value) return;

  const bookings = await readData("bookings");
  const booking = bookings.find((b) => b.id === params.id);
  if (!booking) return fail(res, 404, "Bron topilmadi");
  if (booking.status === "cancelled") return fail(res, 400, "Bekor qilingan bronni o'zgartirib bo'lmaydi");

  const events = await readData("events");
  const event = events.find((e) => e.id === booking.event_id);
  if (!event) return fail(res, 404, "Tadbir topilmadi");

  const diff = value.seats - booking.seats;
  if (diff > event.available_seats) {
    return fail(res, 400, `Faqat ${event.available_seats} ta qo'shimcha joy qoldi`);
  }

  event.available_seats -= diff; // diff manfiy bo'lsa joylar qaytadi
  booking.seats = value.seats;
  booking.total_price = value.seats * event.price;
  await writeData("events", events);
  await writeData("bookings", bookings);

  const user = (await readData("users")).find((u) => u.id === booking.user_id);
  if (user) await sendMail({ to: user.email, ...T.bookingUpdated(user.full_name, event, booking) });

  ok(res, "Bron yangilandi", booking);
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const bookings = await readData("bookings");
  const booking = bookings.find((b) => b.id === params.id);
  if (!booking) return fail(res, 404, "Bron topilmadi");
  if (booking.status === "cancelled") return fail(res, 400, "Bron allaqachon bekor qilingan");

  const events = await readData("events");
  const event = events.find((e) => e.id === booking.event_id);
  if (!event) return fail(res, 404, "Tadbir topilmadi");

  if (new Date(event.starts_at) - Date.now() < DAY_MS) {
    return fail(res, 400, "Tadbirga 24 soatdan kam qolgani uchun bekor qilib bo'lmaydi");
  }

  booking.status = "cancelled";
  event.available_seats = Math.min(event.capacity, event.available_seats + booking.seats);
  await writeData("events", events);
  await writeData("bookings", bookings);

  const user = (await readData("users")).find((u) => u.id === booking.user_id);
  if (user) await sendMail({ to: user.email, ...T.bookingCancelled(user.full_name, event, booking) });

  ok(res, "Bron bekor qilindi", booking);
});

exports.deleteBooking = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const bookings = await readData("bookings");
  const booking = bookings.find((b) => b.id === params.id);
  if (!booking) return fail(res, 404, "Bron topilmadi");

  if (booking.status === "confirmed") {
    const events = await readData("events");
    const event = events.find((e) => e.id === booking.event_id);
    if (event) {
      event.available_seats = Math.min(event.capacity, event.available_seats + booking.seats);
      await writeData("events", events);
    }
  }

  await writeData("bookings", bookings.filter((b) => b.id !== booking.id));
  ok(res, "Bron o'chirildi", null);
});
