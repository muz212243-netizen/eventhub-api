const crypto = require("crypto");

// 6 xonali OTP kod
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// EVH-XXXXXX (mavjud kodlar bilan takrorlanmaydi)
function generateTicketCode(existingCodes = []) {
  const used = new Set(existingCodes);
  let code;
  do {
    let part = "";
    for (let i = 0; i < 6; i++) part += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
    code = `EVH-${part}`;
  } while (used.has(code));
  return code;
}

module.exports = { generateOtp, generateTicketCode };
