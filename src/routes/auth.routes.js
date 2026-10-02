const router = require("express").Router();
const c = require("../controllers/auth.controller");

router.post("/register", c.register);
router.post("/verify-email", c.verifyEmail);
router.post("/resend-code", c.resendCode);
router.post("/login", c.login);
router.post("/forgot-password", c.forgotPassword);
router.post("/reset-password", c.resetPassword);

module.exports = router;
