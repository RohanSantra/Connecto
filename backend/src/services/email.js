import nodemailer from "nodemailer";

const createTransport = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Produces both HTML and plain-text versions of the OTP email.
 * - otp: string (the one-time code)
 * - to: recipient email (used to create verify link)
 */
const buildOtpEmail = ({ otp, to }) => {
  const appUrl = process.env.FRONTEND_URL || "https://app.connecto.example";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@connecto.example";
  const verifyUrl = `${appUrl.replace(/\/$/, "")}/verify?email=${encodeURIComponent(
    to
  )}&otp=${encodeURIComponent(otp)}`;

  const subject = "Your Connecto verification code";

  // Plain-text fallback (important for deliverability & accessibility)
  const text = `Connecto - Your verification code

Your one-time verification code is: ${otp}

This code will expire in 2 minutes.

Open this link to verify now:
${verifyUrl}

If you didn't request this, ignore this email or contact support: ${supportEmail}

Thanks,
Connecto — Private. Fast. Encrypted.
`;

  // HTML email (inline styles for best compatibility)
  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Connecto — Your verification code</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="max-width:680px;width:100%;background:rgba(255,255,255,0.98);border-radius:14px;box-shadow:0 8px 30px rgba(12,16,31,0.12);overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <!-- Header: brand -->
                <div style="display:flex;align-items:center;gap:12px;">
                  <div>
                    <div style="font-size:16px;font-weight:600;color:#0f172a;">Connecto</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Private · Fast · Encrypted</div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px 8px 28px;">
                <h1 style="margin:0;font-size:20px;color:#0b1220;">Your verification code</h1>
                <p style="margin:10px 0 0 0;color:#475569;font-size:14px;line-height:1.45;">
                  Use the code below to verify your Connecto account. It expires in <strong>2 minutes</strong>.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:20px 28px;">
                <!-- OTP badge -->
                <div style="display:inline-block;padding:18px 26px;border-radius:12px;background:linear-gradient(180deg,#0f172a,#0b1220);color:#ffffff;font-weight:700;font-size:22px;letter-spacing:3px;">
                  ${otp}
                </div>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:12px 28px 18px 28px;">
                <!-- CTA -->
                <a href="${verifyUrl}" style="display:inline-block;text-decoration:none;padding:12px 20px;border-radius:10px;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;font-weight:600;">
                  Verify your account
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 22px 28px;color:#334155;font-size:13px;line-height:1.5;">
                <p style="margin:0;color:#64748b;font-size:12px;">
                  If you did not request this code, you can safely ignore this message. If you have concerns, contact <a href="mailto:${supportEmail}" style="color:#0f172a;text-decoration:underline;">${supportEmail}</a>.
                </p>

                <p style="margin:10px 0 0 0;color:#94a3b8;font-size:11px;">
                  Connecto · Private. Fast. Encrypted.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:linear-gradient(180deg,rgba(15,23,42,0.02),transparent);padding:12px 18px;text-align:center;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} Connecto — All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  return { subject, text, html };
};

export const sendOtpEmail = async ({ to, otp }) => {
  const transporter = createTransport();
  const { subject, text, html } = buildOtpEmail({ otp, to });

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
};

/**
 * sendGenericMail: low-level helper for other templates
 * - to: recipient email
 * - subject: plain subject
 * - html: full HTML body (optional)
 * - text: plain text fallback (optional)
 */
export const sendGenericMail = async ({ to, subject, html, text }) => {
  const transporter = createTransport();
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
};

/**
 * Optional helper: friendly verification success email
 * Call: sendVerificationSuccess({ to, name })
 */
export const sendVerificationSuccess = async ({ to, name }) => {
  const transporter = createTransport();
  const appUrl = process.env.FRONTEND_URL || "https://app.connecto.example";

  const subject = "Welcome to Connecto — You're verified";
  const text = `Hi ${name || ""},

Your account has been successfully verified. Welcome to Connecto!

Open your app: ${appUrl}

Thanks,
Connecto`;

  const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:24px auto;padding:20px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(2,6,23,0.06);">
      <h2 style="margin:0 0 12px 0;">You're all set${name ? ", " + name : ""} 🎉</h2>
      <p style="margin:0 0 16px 0;color:#475569;">Your Connecto account is verified and ready. We value your privacy — your messages are end-to-end encrypted.</p>
      <a href="${appUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;font-weight:600;">Open Connecto</a>
      <p style="margin:18px 0 0 0;font-size:12px;color:#94a3b8;">If you did not create this account, please contact <a href="mailto:${process.env.SUPPORT_EMAIL || "support@connecto.example"}">support</a>.</p>
    </div>
  </div>
  `;

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
};
