require("dotenv").config();
const express = require("express");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");

const app = express();

app.use(express.json());
// Express 5 da body yuborilmasa req.body undefined bo'ladi
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route topilmadi" }));

// Umumiy xato ushlagich (masalan, noto'g'ri JSON)
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Noto'g'ri JSON formati" });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Serverda kutilmagan xato yuz berdi" });
});

module.exports = app;
