const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const money = (n) => (n === 0 ? "Bepul" : `${Number(n).toLocaleString("ru-RU")} so'm`);

const layout = (title, content) => `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#4f46e5;color:#ffffff;padding:20px 28px;font-size:22px;font-weight:bold;">EventHub</div>
    <div style="padding:28px;color:#111827;font-size:15px;line-height:1.6;">
      <h2 style="margin-top:0;">${esc(title)}</h2>
      ${content}
    </div>
    <div style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">Bu avtomatik xabar. Javob yozish shart emas.</div>
  </div>
</body></html>`;

const codeBox = (code) =>
  `<div style="margin:20px 0;text-align:center;font-size:34px;letter-spacing:10px;font-weight:bold;color:#4f46e5;background:#eef2ff;padding:16px;border-radius:8px;">${esc(code)}</div>`;

const row = (label, value) =>
  `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${esc(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${esc(value)}</td></tr>`;

const bookingTable = (event, booking) => `
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    ${row("Tadbir", event.title)}
    ${row("Sana va vaqt", fmtDate(event.starts_at))}
    ${row("Manzil", `${event.city}, ${event.venue}`)}
    ${row("Joylar soni", booking.seats)}
    ${row("Umumiy narx", money(booking.total_price))}
    ${row("Chipta kodi", booking.ticket_code)}
  </table>`;

module.exports = {
  verifyCode: (name, code) => ({
    subject: "EventHub: emailni tasdiqlash kodi",
    html: layout(
      `Salom, ${name}!`,
      `<p>EventHub'ga xush kelibsiz. Emailingizni tasdiqlash uchun quyidagi koddan foydalaning:</p>${codeBox(code)}<p>Kod <b>10 daqiqa</b> amal qiladi.</p>`
    ),
  }),
  welcome: (name) => ({
    subject: "EventHub'ga xush kelibsiz!",
    html: layout(`Xush kelibsiz, ${name}!`, `<p>Emailingiz muvaffaqiyatli tasdiqlandi. Endi tadbirlarga joy bron qilishingiz mumkin.</p>`),
  }),
  resetCode: (name, code) => ({
    subject: "EventHub: parolni tiklash kodi",
    html: layout(
      `Salom, ${name}!`,
      `<p>Parolni tiklash uchun kod:</p>${codeBox(code)}<p>Kod <b>10 daqiqa</b> amal qiladi. Agar bu siz bo'lmasangiz, xatni e'tiborsiz qoldiring.</p>`
    ),
  }),
  passwordChanged: (name) => ({
    subject: "EventHub: parolingiz o'zgartirildi",
    html: layout(`Salom, ${name}!`, `<p>Parolingiz o'zgartirildi. Agar bu siz bo'lmasangiz, darhol bizga murojaat qiling.</p>`),
  }),
  ticket: (name, event, booking) => ({
    subject: `EventHub: chiptangiz ${booking.ticket_code}`,
    html: layout(`Broningiz tasdiqlandi, ${name}!`, `<p>Chiptangiz tayyor:</p>${bookingTable(event, booking)}`),
  }),
  bookingUpdated: (name, event, booking) => ({
    subject: "EventHub: broningiz o'zgartirildi",
    html: layout(`Broningiz o'zgartirildi, ${name}`, bookingTable(event, booking)),
  }),
  bookingCancelled: (name, event, booking) => ({
    subject: "EventHub: broningiz bekor qilindi",
    html: layout(`Broningiz bekor qilindi, ${name}`, `<p>Quyidagi bron bekor qilindi:</p>${bookingTable(event, booking)}`),
  }),
  eventCancelled: (name, event, booking) => ({
    subject: `EventHub: "${event.title}" tadbiri bekor qilindi`,
    html: layout(
      `Tadbir bekor qilindi`,
      `<p>Hurmatli ${esc(name)}, afsuski, <b>${esc(event.title)}</b> (${esc(fmtDate(event.starts_at))}) tadbiri bekor qilindi.</p><p>Chipta kodingiz: <b>${esc(booking.ticket_code)}</b> endi amal qilmaydi.</p>`
    ),
  }),
};
