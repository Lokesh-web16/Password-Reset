import nodemailer from "nodemailer";

/**
 * Returns true only when real SMTP credentials have been configured (i.e. the
 * user filled in .env). The shipped .env uses placeholder values, so until
 * those are replaced we fall back to a Nodemailer test inbox.
 */
const hasRealSmtp = () => {
  const { SMTP_USER, SMTP_PASS } = process.env;
  return (
    SMTP_USER &&
    SMTP_PASS &&
    SMTP_USER !== "your_email@gmail.com" &&
    SMTP_PASS !== "your_app_password"
  );
};

// Cache the transporter so we don't rebuild it (or re-create an Ethereal
// account) on every email.
let cachedTransporter = null;
let usingTestAccount = false;

/**
 * Lazily builds (and caches) the Nodemailer transporter.
 * - If real SMTP_* env vars are set, uses those.
 * - Otherwise creates a free Ethereal test account so local development works
 *   with zero configuration. The email is not really delivered; instead a
 *   preview URL is logged to the console.
 */
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // During automated tests, use Nodemailer's JSON transport: it serializes the
  // message instead of sending it, so tests are fast, offline, and hermetic.
  if (process.env.NODE_ENV === "test") {
    cachedTransporter = nodemailer.createTransport({ jsonTransport: true });
    usingTestAccount = false;
    return cachedTransporter;
  }

  if (hasRealSmtp()) {
    const port = Number(process.env.SMTP_PORT) || 587;
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 requires an implicit TLS connection (secure=true). Port 587
      // upgrades via STARTTLS (secure=false). Derive this from the port so a
      // misconfigured SMTP_SECURE flag cannot break the connection.
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        // Strip any spaces from the app password — Gmail shows it in groups of
        // four (e.g. "abcd efgh ijkl mnop") and pasted spaces cause auth fails.
        pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
      },
      // Fail fast instead of hanging if the host blocks outbound SMTP.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    usingTestAccount = false;
  } else {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    usingTestAccount = true;
    console.log(
      "\n[mailer] No real SMTP configured — using an Ethereal test inbox.\n" +
        "[mailer] Reset emails will NOT reach a real address; open the preview\n" +
        "[mailer] URL printed below to view each email and click the link.\n"
    );
  }

  return cachedTransporter;
};

/**
 * HTML template for the password reset email. Kept inline so the server has no
 * extra templating dependency.
 *
 * @param {string} resetLink   Fully-qualified reset URL including the token.
 * @param {number} expiryMins  Minutes until the link expires (shown to user).
 */
const buildResetEmail = (resetLink, expiryMins) => `
  <div style="margin:0;padding:40px 20px;background:#0f172a;background:linear-gradient(135deg,#1e1b4b,#0b0a1a);font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.35);">
      <!-- Gradient header -->
      <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);padding:40px 32px;text-align:center;">
        <div style="width:64px;height:64px;margin:0 auto 16px;background:rgba(255,255,255,0.18);border-radius:18px;line-height:64px;font-size:30px;">
          &#128274;
        </div>
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">
          Reset your password
        </h1>
      </div>

      <!-- Body -->
      <div style="padding:36px 32px;">
        <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 8px;">
          We received a request to reset your password. Tap the button below to
          choose a new one.
        </p>
        <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 28px;">
          This link expires in <strong style="color:#4338ca;">${expiryMins} minutes</strong> and can only be used once.
        </p>

        <div style="text-align:center;margin:0 0 28px;">
          <a href="${resetLink}"
             style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:15px 38px;border-radius:12px;font-size:15px;font-weight:700;box-shadow:0 10px 24px rgba(99,102,241,0.45);">
            Reset Password
          </a>
        </div>

        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          If the button does not work, copy and paste this link into your browser:
          <br />
          <a href="${resetLink}" style="color:#6366f1;word-break:break-all;">${resetLink}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #f1f5f9;padding:20px 32px;background:#f8fafc;">
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
          If you did not request a password reset, you can safely ignore this
          email &mdash; your password will stay the same.
        </p>
      </div>
    </div>
  </div>
`;

/**
 * Sends the password reset email.
 *
 * @param {string} to          Recipient email address.
 * @param {string} resetLink   Reset URL containing the token.
 * @param {number} expiryMins  Minutes until expiry, for display.
 */
export const sendResetEmail = async (to, resetLink, expiryMins) => {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@example.com",
    to,
    subject: "Password Reset Request",
    html: buildResetEmail(resetLink, expiryMins),
  });

  // When using the Ethereal test inbox, surface the preview URL + raw link so
  // the developer can complete the flow without a real mailbox.
  if (usingTestAccount) {
    const preview = nodemailer.getTestMessageUrl(info);
    console.log("\n========================================================");
    console.log("[mailer] Test email sent. Preview it here:");
    console.log(`         ${preview}`);
    console.log("[mailer] Or open the reset link directly:");
    console.log(`         ${resetLink}`);
    console.log("========================================================\n");
  }
};
