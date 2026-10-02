# EventHub API

Tadbirlar va chiptalarni bron qilish tizimining backend qismi (REST API).
**Stack:** Node.js, Express, Joi, bcrypt, Nodemailer, JSON fayllar (`fs/promises`).

## O'rnatish

```bash
   git clone https://github.com/muz212243-netizen/eventhub-api.git eventhub-api
cd eventhub-api
npm i
cp .env.example .env     # va ichini to'ldiring
npm run dev              # http://localhost:3000
```

### .env sozlamalari

| O'zgaruvchi | Izoh |
|---|---|
| `PORT` | Server porti (default 3000) |
| `MAIL_HOST`, `MAIL_PORT` | SMTP server (Gmail: `smtp.gmail.com`, `587`) |
| `MAIL_USER`, `MAIL_PASS` | Gmail manzil va **App Password** (oddiy parol emas) |
| `MAIL_FROM` | Yuboruvchi nomi |

> `MAIL_USER` / `MAIL_PASS` bo'sh qoldirilsa, loyiha avtomatik **Ethereal** test akkauntidan foydalanadi.
> Yuborilgan emailni ko'rish havolasi (preview URL) terminalda chiqadi.

## Struktura

`routes` faqat URL'ni controller'ga bog'laydi, barcha logika `controllers` ichida, Joi sxemalar `validations` da,
yordamchi funksiyalar (`fileDb`, `mailer`, `generateCode`, `emailTemplates`) `utils` da.

## Javob formati

```json
{ "success": true, "message": "...", "data": {} }
{ "success": true, "data": [], "meta": { "page": 1, "limit": 10, "total": 47, "totalPages": 5 } }
{ "success": false, "message": "Validatsiya xatosi", "errors": [{ "field": "email", "message": "..." }] }
```

## Endpointlar

| Metod | URL | Tavsif |
|---|---|---|
| GET | `/api/health` | Server holati |
| POST | `/api/auth/register` | Ro'yxatdan o'tish, emailga 6 xonali kod |
| POST | `/api/auth/verify-email` | Emailni kod bilan tasdiqlash |
| POST | `/api/auth/resend-code` | Kodni qayta yuborish (60 soniya oraliq) |
| POST | `/api/auth/login` | Kirish |
| POST | `/api/auth/forgot-password` | Parolni tiklash kodini yuborish |
| POST | `/api/auth/reset-password` | Kod bilan yangi parol o'rnatish |
| GET | `/api/users/:id` | Profil + `activeBookings` |
| PUT | `/api/users/:id` | Ismni o'zgartirish |
| PUT | `/api/users/:id/password` | Parolni o'zgartirish |
| DELETE | `/api/users/:id` | Akkauntni o'chirish (body: `password`) |
| GET | `/api/users/:id/bookings` | Foydalanuvchi bronlari |
| POST | `/api/events` | Tadbir yaratish |
| GET | `/api/events` | Ro'yxat: `search, category, city, free, sort, page, limit, all` |
| GET | `/api/events/:id` | Tadbir + `bookedSeats` |
| PUT | `/api/events/:id` | Tadbirni yangilash |
| DELETE | `/api/events/:id` | O'chirish + ishtirokchilarga email |
| GET | `/api/events/:id/bookings` | Tadbirga yozilganlar va jami hisobot |
| POST | `/api/bookings` | Bron qilish + email chipta |
| GET | `/api/bookings` | Bronlar: `status, event_id, page, limit` |
| GET | `/api/bookings/:id` | Bron tafsilotlari |
| PUT | `/api/bookings/:id` | Joylar sonini o'zgartirish |
| PUT | `/api/bookings/:id/cancel` | Bronni bekor qilish (24 soat qoidasi) |
| DELETE | `/api/bookings/:id` | Bronni butunlay o'chirish |

## Postman

`postman_collection.json` faylini Postman'ga import qiling (`baseUrl` = `http://localhost:3000`).

## Tekshirish tartibi

1. `register` -> emailga kelgan kod (yoki Ethereal preview) -> `verify-email`
2. `login` -> `GET /api/events` -> `POST /api/bookings`
