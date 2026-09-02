import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter = null;

if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,   // App Password de 16 caracteres (no la contraseña normal)
    },
  });
  logger.app.info(`✅ Mailer listo — desde: ${process.env.GMAIL_USER}`);
} else {
  logger.app.warn('⚠️  GMAIL_USER / GMAIL_PASS no configuradas — emails desactivados');
}

const APP_URL = process.env.APP_URL || 'http://localhost:4000';

export async function enviarEmail({ to, subject, body, url }) {
  if (!transporter || !to) return;

  const urlCompleta = url?.startsWith('http') ? url : `${APP_URL}${url || '/'}`;

  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:auto;padding:24px;background:#f7f6f8;border-radius:12px">
      <div style="background:#7f13ec;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px">
        <h1 style="color:#fff;margin:0;font-size:20px">🎨 TattooStudio</h1>
      </div>
      <div style="background:#fff;border-radius:8px;padding:24px">
        <h2 style="color:#191022;margin-top:0">${subject}</h2>
        <p style="color:#555;line-height:1.6">${body}</p>
        <a href="${urlCompleta}"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7f13ec;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Ver en la app →
        </a>
      </div>
      <p style="color:#999;font-size:12px;text-align:center;margin-top:16px">
        Este correo fue enviado automáticamente por TattooStudio. No respondas a este mensaje.
      </p>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"TattooStudio" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.app.info(`📧 Email → ${to}: ${subject}`);
  } catch (err) {
    logger.app.error(`mailer error → ${to}: ${err.message}`);
  }
}
