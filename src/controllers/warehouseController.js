const { pool } = require('../db/db');
const { sendVerificationCode } = require('../services/mailService');

/**
 * Generate a secure 6-digit random code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request verification code (OTP) for email
 */
async function sendOtp(req, res, next) {
  const { email } = req.body;

  try {
    // Generate code and expiry time (15 minutes from now)
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save code to database
    const query = `
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, ?)
    `;
    await pool.query(query, [email, code, expiresAt]);

    // Send code via email
    const sent = await sendVerificationCode(email, code);

    if (!sent) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el correo de verificación. Intente de nuevo.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Código de verificación enviado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify OTP
 */
async function verifyOtp(req, res, next) {
  const { email, code } = req.body;

  try {
    // Find the latest active code for this email
    const query = `
      SELECT id, expires_at FROM email_verifications
      WHERE email = ? AND code = ? AND verified = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
    const [rows] = await pool.query(query, [email, code]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Código de verificación inválido o ya utilizado.'
      });
    }

    const record = rows[0];
    const now = new Date();

    if (new Date(record.expires_at) < now) {
      return res.status(400).json({
        success: false,
        message: 'El código de verificación ha expirado.'
      });
    }

    // Mark as verified
    const updateQuery = `
      UPDATE email_verifications
      SET verified = TRUE
      WHERE id = ?
    `;
    await pool.query(updateQuery, [record.id]);

    return res.status(200).json({
      success: true,
      message: 'Correo electrónico verificado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new warehouse
 */
async function registerWarehouse(req, res, next) {
  const {
    identification_number,
    name,
    address,
    country,
    department,
    city,
    phone,
    contact_person,
    user_class,
    website,
    email
  } = req.body;

  try {
    // 1. Verify if email is already registered
    const [existingWarehouse] = await pool.query(
      'SELECT id FROM warehouses WHERE email = ? OR identification_number = ?',
      [email, identification_number]
    );

    if (existingWarehouse.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El número de identificación o el correo electrónico ya se encuentran registrados.'
      });
    }

    // 2. Verify that email has been validated through OTP
    // We check if there's a verified record in the last 1 hour
    const checkVerificationQuery = `
      SELECT id FROM email_verifications
      WHERE email = ? AND verified = TRUE AND created_at >= NOW() - INTERVAL 1 HOUR
      LIMIT 1
    `;
    const [verifications] = await pool.query(checkVerificationQuery, [email]);

    if (verifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no ha sido verificado. Por favor valide su correo primero.'
      });
    }

    // 3. Insert new warehouse
    const insertQuery = `
      INSERT INTO warehouses (
        identification_number, name, address, country, department, city, phone,
        contact_person, user_class, website, email, is_email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `;

    const [result] = await pool.query(insertQuery, [
      identification_number,
      name,
      address,
      country || 'Colombia',
      department || '',
      city,
      phone || null,
      contact_person || null,
      user_class,
      website || null,
      email
    ]);

    return res.status(201).json({
      success: true,
      message: 'Almacén registrado con éxito.',
      data: {
        id: result.insertId,
        identification_number,
        name,
        email,
        status: 'Por Aprobar'
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  registerWarehouse
};
