const router = require("express").Router();
const c = require("../controllers/user.controller");
const bookingController = require("../controllers/booking.controller");

router.get("/:id", c.getUser);
router.put("/:id", c.updateUser);
router.put("/:id/password", c.changePassword);
router.delete("/:id", c.deleteUser);
router.get("/:id/bookings", bookingController.getUserBookings);

module.exports = router;
