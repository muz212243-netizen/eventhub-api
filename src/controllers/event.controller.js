const { readData, writeData } = require("../utils/fileDb");
const { sendMail } = require("../utils/mailer");
const T = require("../utils/emailTemplates");
const { nextId, ok, fail, validate, paginate, asyncHandler } = require("../utils/helpers");
const { idParamSchema } = require("../validations/common.validation");
const {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
} = require("../validations/event.validation");

const sorters = {
  date_asc: (a, b) => new Date(a.starts_at) - new Date(b.starts_at),
  date_desc: (a, b) => new Date(b.starts_at) - new Date(a.starts_at),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
};

exports.createEvent = asyncHandler(async (req, res) => {
  const value = validate(createEventSchema, req.body, res);
  if (!value) return;

  const events = await readData("events");
  const event = {
    id: nextId(events),
    title: value.title,
    description: value.description || "",
    category: value.category,
    city: value.city,
    venue: value.venue,
    starts_at: value.starts_at.toISOString(),
    price: value.price,
    capacity: value.capacity,
    available_seats: value.capacity,
    created_at: new Date().toISOString(),
  };
  events.push(event);
  await writeData("events", events);
  ok(res, "Tadbir yaratildi", event, 201);
});

exports.getEvents = asyncHandler(async (req, res) => {
  const q = validate(listEventsQuerySchema, req.query, res);
  if (!q) return;

  let list = await readData("events");

  // 1) filtrlash
  if (!q.all) list = list.filter((e) => new Date(e.starts_at) > new Date());
  if (q.search) {
    const s = q.search.toLowerCase();
    list = list.filter(
      (e) => e.title.toLowerCase().includes(s) || (e.description || "").toLowerCase().includes(s)
    );
  }
  if (q.category) list = list.filter((e) => e.category === q.category);
  if (q.city) list = list.filter((e) => e.city.toLowerCase() === q.city.toLowerCase());
  if (q.free) list = list.filter((e) => e.price === 0);

  // 2) saralash
  list = [...list].sort(sorters[q.sort]);

  // 3) pagination
  const { items, meta } = paginate(list, q.page, q.limit);
  res.status(200).json({ success: true, data: items, meta });
});

exports.getEvent = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const events = await readData("events");
  const event = events.find((e) => e.id === params.id);
  if (!event) return fail(res, 404, "Tadbir topilmadi");

  ok(res, "Tadbir ma'lumotlari", { ...event, bookedSeats: event.capacity - event.available_seats });
});

exports.updateEvent = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;
  const value = validate(updateEventSchema, req.body, res);
  if (!value) return;

  const events = await readData("events");
  const index = events.findIndex((e) => e.id === params.id);
  if (index === -1) return fail(res, 404, "Tadbir topilmadi");

  const current = events[index];
  const bookedSeats = current.capacity - current.available_seats;

  if (value.starts_at) value.starts_at = value.starts_at.toISOString();
  if (value.capacity !== undefined) {
    if (value.capacity < bookedSeats) {
      return fail(res, 400, `Allaqachon ${bookedSeats} ta joy band qilingan`);
    }
    value.available_seats = value.capacity - bookedSeats;
  }

  events[index] = { ...current, ...value };
  await writeData("events", events);
  ok(res, "Tadbir yangilandi", events[index]);
});

exports.deleteEvent = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const events = await readData("events");
  const event = events.find((e) => e.id === params.id);
  if (!event) return fail(res, 404, "Tadbir topilmadi");

  const bookings = await readData("bookings");
  const users = await readData("users");

  const affected = bookings.filter((b) => b.event_id === event.id && b.status === "confirmed");
  affected.forEach((b) => (b.status = "cancelled"));

  await writeData("events", events.filter((e) => e.id !== event.id));
  await writeData("bookings", bookings);

  // Bittasi xato bersa, qolganlari to'xtamaydi
  const results = await Promise.allSettled(
    affected.map((b) => {
      const user = users.find((u) => u.id === b.user_id);
      if (!user) return Promise.resolve(false);
      return sendMail({ to: user.email, ...T.eventCancelled(user.full_name, event, b) });
    })
  );
  const notifiedUsers = results.filter((r) => r.status === "fulfilled" && r.value === true).length;

  ok(res, "Tadbir o'chirildi", { notifiedUsers });
});

exports.getEventBookings = asyncHandler(async (req, res) => {
  const params = validate(idParamSchema, req.params, res);
  if (!params) return;

  const events = await readData("events");
  const event = events.find((e) => e.id === params.id);
  if (!event) return fail(res, 404, "Tadbir topilmadi");

  const users = await readData("users");
  const bookings = (await readData("bookings")).filter(
    (b) => b.event_id === event.id && b.status === "confirmed"
  );

  const attendees = bookings.map((b) => {
    const user = users.find((u) => u.id === b.user_id);
    return {
      booking_id: b.id,
      full_name: user ? user.full_name : null,
      email: user ? user.email : null,
      seats: b.seats,
      ticket_code: b.ticket_code,
      created_at: b.created_at,
    };
  });

  ok(res, "Tadbirga yozilganlar", {
    event: { id: event.id, title: event.title },
    attendees,
    summary: {
      totalBookings: bookings.length,
      totalSeats: bookings.reduce((sum, b) => sum + b.seats, 0),
      estimatedRevenue: bookings.reduce((sum, b) => sum + b.total_price, 0),
    },
  });
});
