<div align="center">

<img src="https://readme-typing-svg.demolab.com/?font=Plus+Jakarta+Sans&weight=800&size=34&duration=3000&pause=800&color=8B5CF6&center=true&vCenter=true&width=620&height=70&lines=Password+Reset+Flow;Secure+%E2%80%A2+Production-Ready" alt="Password Reset Flow" />

<p>
  <em>A polished, secure password reset experience &mdash; email verification, expiring single-use tokens and a premium animated UI.</em>
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Nodemailer-Email-0A66C2?style=for-the-badge&logo=minutemailer&logoColor=white" alt="Nodemailer" />
</p>

<p>
  <img src="https://img.shields.io/badge/Frontend-Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white" alt="Netlify" />
  <img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white" alt="Render" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/status-ready-success?style=flat-square" alt="Status" />
</p>

</div>

<br />

<div align="center">

```
  ┌─────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │   Forgot    │─────▶│   Generate   │─────▶│  Email reset │─────▶│  Set new     │
  │  password   │      │ token + save │      │     link     │      │  password    │
  └─────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
        │                     │                      │                     │
   enter email          hashed + expiry         Nodemailer           token cleared
   check in DB          stored in DB            (real inbox)          (single-use)
```

</div>

---

## ✨ Highlights

<table>
  <tr>
    <td width="50%" valign="top">

**🔒 Security first**
- 32-byte cryptographically random tokens
- Only a **SHA-256 hash** is stored in the DB
- Tokens **expire** (default 15 min) and are **single-use**
- Passwords hashed with **bcrypt**
- Reset endpoints are **rate-limited**

  </td>
  <td width="50%" valign="top">

**🎨 Premium experience**
- Animated aurora gradient + floating orbs
- Frosted-glass card with a rotating glow border
- Live password-strength meter
- Show/hide toggle, inline validation
- Fully responsive, `prefers-reduced-motion` aware

  </td>
  </tr>
</table>

---

## 🧭 The reset flow

1. User opens the **Forgot Password** page and enters their email.
2. The server checks the database:
   - ❌ User **not found** → returns a clear error message.
   - ✅ User **found** → generates a random string, stores a **hashed** copy plus an **expiry**, and emails a reset link containing the raw string.
3. The reset link opens the **Reset Password** page, which verifies the token on load:
   - Valid & not expired → shows the new-password form.
   - Missing / wrong / **expired** → shows an "link no longer valid" alert.
4. On submit, the server re-validates, saves the new (hashed) password, and **clears the token** so the link cannot be reused.

---

## 🛠 Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Bootstrap 5, custom CSS animations |
| Routing | React Router |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Email | Nodemailer (SMTP / Gmail App Password) |
| Hosting | Netlify (client) · Render (server) |

---

## 📁 Project structure

```
Password Reset/
├── client/                  # React + Vite + Bootstrap front-end
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── components/Icons.jsx
│   │   ├── api.js            # fetch wrapper for the backend
│   │   ├── styles.css        # premium theme + animations
│   │   └── main.jsx          # router + background orbs
│   ├── netlify.toml          # Netlify deploy config (SPA redirect)
│   └── .env.example
└── server/                  # Node.js + Express API
    ├── config/db.js
    ├── models/User.js
    ├── controllers/authController.js
    ├── routes/authRoutes.js
    ├── utils/mailer.js       # Nodemailer transport + HTML email
    ├── server.js
    ├── render.yaml           # Render deploy config
    └── .env.example
```

---

## 🚀 Getting started

<details open>
<summary><b>1 · Backend</b></summary>

```bash
cd server
npm install
cp .env.example .env          # then fill in the values
npm run dev                    # http://localhost:5001
```

Fill these in `server/.env`:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `CLIENT_URL` | URL of the React client (for the email link) |
| `RESET_TOKEN_EXPIRY_MINUTES` | Link lifetime in minutes (default 15) |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + **App Password** |
| `MAIL_FROM` | The "from" name/address shown in the email |

> 💡 For Gmail, enable 2-Step Verification then create an App Password at
> <https://myaccount.google.com/apppasswords>.

</details>

<details>
<summary><b>2 · Frontend</b></summary>

```bash
cd client
npm install
cp .env.example .env          # set VITE_API_URL=http://localhost:5001
npm run dev                    # http://localhost:5173
```

</details>

<details>
<summary><b>3 · Create a test user</b></summary>

There is no signup screen (the task is the reset flow only), so seed a user:

```bash
curl -X POST http://localhost:5001/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"you@example.com","password":"oldpass123"}'
```

Now open <http://localhost:5173>, enter that email, and follow the link in the
email you receive.

</details>

---

## 🔌 API reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/forgot-password` | Send a reset link if the user exists |
| `GET`  | `/api/auth/verify-token/:token` | Check if a reset link is still valid |
| `POST` | `/api/auth/reset-password/:token` | Save the new password, clear the token |
| `POST` | `/api/auth/seed` | Create a demo user (testing only) |

<details>
<summary><b>Example requests</b></summary>

```bash
# Request a reset link
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'

# Submit a new password
curl -X POST http://localhost:5001/api/auth/reset-password/<TOKEN> \
  -H "Content-Type: application/json" \
  -d '{"password":"newpass456"}'
```

</details>




---

## 🔐 Security notes

- Reset tokens are random 32-byte strings; only a **SHA-256 hash** is stored, so a database leak does not expose usable links.
- Tokens **expire** and are **single-use** (cleared on success).
- Passwords are hashed with **bcrypt** before storage.
- The reset endpoints are **rate-limited** to slow brute-force attempts.
- Secrets live in `.env` files that are **gitignored**.

---

<div align="center">
  <sub>Built with React · Bootstrap · Node.js · Nodemailer</sub>
</div>
