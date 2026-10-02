const router = require("express").Router();
const c = require("../controllers/event.controller");

router.post("/", c.createEvent);
router.get("/", c.getEvents);
router.get("/:id", c.getEvent);
router.put("/:id", c.updateEvent);
router.delete("/:id", c.deleteEvent);
router.get("/:id/bookings", c.getEventBookings);

module.exports = router;
