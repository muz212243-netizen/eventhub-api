const nodemailer = require("nodemailer");

let transporterPromise = null;

// .env da MAIL_USER/MAIL_PASS bo'lsa - haqiqiy SMTP, bo'lmasa - Ethereal (test)
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.MAIL_USER && process.env.MAIL_PASS) {
        const port = Number(process.env.MAIL_PORT) || 587;
        return nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port,
          secure: port === 465,
          auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
        });
      }
      const account = await nodemailer.createTestAccount();
      console.log("MAIL sozlanmagan - Ethereal test akkaunt ishlatilmoqda:", account.user);
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      });
    })().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }
  return transporterPromise;
}

// Hech qachon xato otmaydi: email xatosi so'rovni yiqitmasligi kerak.
// Muvaffaqiyatli bo'lsa true, aks holda false qaytaradi.
async function sendMail({ to, subject, html }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || "EventHub <no-reply@eventhub.uz>",
      to,
      subject,
      html,
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`Email ko'rish havolasi (${to}):`, preview);
    return true;
  } catch (err) {
    console.error(`Email yuborishda xato (${to}):`, err.message);
    return false;
  }
}

module.exports = { sendMail };
