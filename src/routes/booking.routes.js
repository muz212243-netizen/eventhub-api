const router = require("express").Router();
const c = require("../controllers/booking.controller");

router.post("/", c.createBooking);
router.get("/", c.getBookings);
router.get("/:id", c.getBooking);
router.put("/:id/cancel", c.cancelBooking);
router.put("/:id", c.updateBooking);
router.delete("/:id", c.deleteBooking);

module.exports = router;
