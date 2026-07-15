const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter only if environment variables are set
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends a verification code (OTP) to the given email
 * @param {string} email - Destination email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} - True if sent, false otherwise
 */
async function sendVerificationCode(email, code) {
  const from = process.env.SMTP_FROM || 'Partzix <soporte@partzix.com>';
  const subject = 'Código de verificación de correo - Partzix';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
      <h2 style="color: #ff6600; text-align: center;">Verificación de correo Partzix</h2>
      <p>Hola,</p>
      <p>Gracias por iniciar el registro de tu almacén en <strong>Partzix</strong>. Por favor, usa el siguiente código de un solo uso (OTP) para verificar tu dirección de correo electrónico:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f7f7f7; padding: 10px 20px; border-radius: 4px; border: 1px dashed #ccc; color: #333;">${code}</span>
      </div>
      <p style="color: #666; font-size: 14px;">Este código tiene una validez de 15 minutos. Si no solicitaste este código, puedes ignorar este correo de forma segura.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="text-align: center; font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} Partzix. Todos los derechos reservados.</p>
    </div>
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL MOCK] Sending OTP code to: ${email}`);
    console.log(`🔑 OTP Code: ${code}`);
    console.log(`======================================================\n`);
    return true;
  }

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    // Even if it fails, log it to console as fallback in dev mode
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 [FALLBACK EMAIL LOG] OTP Code for ${email} is ${code}`);
    }
    return false;
  }
}

module.exports = {
  sendVerificationCode,
};
