const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db/db');
const { sendVerificationCode } = require('../services/mailService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_partzix_jwt_key_99';

/**
 * Register warehouse user account
 */
async function register(req, res, next) {
  const { email, password, warehouse_id } = req.body;

  try {
    // 1. Check if email is already registered in users
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado.'
      });
    }

    // 2. Validate that warehouse exists and has no linked user account yet
    const [warehouse] = await pool.query('SELECT id, email, is_email_verified FROM warehouses WHERE id = ?', [warehouse_id]);
    if (warehouse.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El almacén especificado no existe.'
      });
    }

    // Verify email matches the warehouse email
    if (warehouse[0].email !== email) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no coincide con el registrado para el almacén.'
      });
    }

    const [linkedUser] = await pool.query('SELECT id FROM users WHERE warehouse_id = ?', [warehouse_id]);
    if (linkedUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este almacén ya cuenta con un usuario registrado.'
      });
    }

    // 3. Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // 4. Create user (Default role: warehouse, Default status: pending)
    const insertQuery = `
      INSERT INTO users (email, password_hash, role, status, warehouse_id)
      VALUES (?, ?, 'warehouse', 'pending', ?)
    `;
    const [result] = await pool.query(insertQuery, [email, passwordHash, warehouse_id]);

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito. Su cuenta está pendiente de aprobación por el administrador.',
      data: {
        id: result.insertId,
        email,
        warehouse_id,
        status: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 */
async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    // 1. Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    const user = users[0];

    // 2. Compare password
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    // 3. Check status for warehouses (Admin is approved by default)
    if (user.role === 'warehouse' && user.status !== 'approved') {
      const statusMessages = {
        pending: 'Tu cuenta está pendiente de aprobación por el administrador de Partzix.',
        suspended: 'Tu cuenta ha sido suspendida. Contacta a soporte para más detalles.'
      };
      return res.status(403).json({
        success: false,
        message: statusMessages[user.status] || 'Acceso denegado.'
      });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        warehouse_id: user.warehouse_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        warehouse_id: user.warehouse_id
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request Password Reset
 */
async function forgotPassword(req, res, next) {
  const { email } = req.body;

  try {
    // 1. Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // Return 200 even if user does not exist to prevent user enumeration (best practice)
      return res.status(200).json({
        success: true,
        message: 'Si el correo electrónico está registrado, recibirá un código de recuperación.'
      });
    }

    // 2. Generate a 6-digit recovery code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 3. Save recovery code in password_resets
    await pool.query('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)', [
      email,
      code,
      expiresAt
    ]);

    // 4. Send email
    const subject = 'Código de recuperación de contraseña - Partzix';
    const from = process.env.SMTP_FROM || 'Partzix <soporte@partzix.com>';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
        <h2 style="color: #ff6600; text-align: center;">Recuperación de Contraseña - Partzix</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en <strong>Partzix</strong>. Por favor, usa el siguiente código de recuperación en el formulario correspondiente:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f7f7f7; padding: 10px 20px; border-radius: 4px; border: 1px dashed #ccc; color: #333;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Este código expira en 15 minutos. Si no has solicitado este cambio, por favor ignora este correo.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} Partzix. Todos los derechos reservados.</p>
      </div>
    `;

    // Re-use mail client or log to console
    const nodemailer = require('nodemailer');
    let sent = false;
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      try {
        await transporter.sendMail({ from, to: email, subject, html: htmlContent });
        sent = true;
      } catch (err) {
        console.error('Error sending password reset email:', err.message);
      }
    }

    if (!sent) {
      console.log(`\n======================================================`);
      console.log(`📧 [PASSWORD RESET MOCK] Reset code for: ${email}`);
      console.log(`🔑 Reset Code: ${code}`);
      console.log(`======================================================\n`);
    }

    return res.status(200).json({
      success: true,
      message: 'Si el correo electrónico está registrado, recibirá un código de recuperación.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset Password using OTP code
 */
async function resetPassword(req, res, next) {
  const { email, code, new_password } = req.body;

  try {
    // 1. Verify token
    const query = `
      SELECT id, expires_at FROM password_resets
      WHERE email = ? AND token = ?
      ORDER BY created_at DESC LIMIT 1
    `;
    const [rows] = await pool.query(query, [email, code]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Código de recuperación inválido.'
      });
    }

    const record = rows[0];
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'El código de recuperación ha expirado.'
      });
    }

    // 2. Hash new password
    const newHash = bcrypt.hashSync(new_password, 10);

    // 3. Update user password
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [newHash, email]);

    // 4. Delete reset token
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

    return res.status(200).json({
      success: true,
      message: 'Tu contraseña ha sido restablecida con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword
};
