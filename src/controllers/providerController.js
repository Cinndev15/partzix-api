const fs = require('fs');
const { pool } = require('../db/db');
const { sendPhoneVerificationCode } = require('../services/smsService');

/**
 * Helper to delete uploaded files in case of errors
 */
function deleteUploadedFiles(files) {
  if (!files) return;
  Object.keys(files).forEach(fieldName => {
    files[fieldName].forEach(file => {
      fs.unlink(file.path, err => {
        if (err) console.error(`Error deleting file: ${file.path}`, err.message);
      });
    });
  });
}

/**
 * Generate a 6-digit random code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request verification code (OTP) for phone number
 */
async function sendPhoneOtp(req, res, next) {
  const { phone } = req.body;

  try {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save code to database
    const query = `
      INSERT INTO phone_verifications (phone, code, expires_at)
      VALUES (?, ?, ?)
    `;
    await pool.query(query, [phone, code, expiresAt]);

    // Send code via SMS / WhatsApp
    await sendPhoneVerificationCode(phone, code);

    return res.status(200).json({
      success: true,
      message: 'Código de verificación de teléfono enviado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify phone OTP
 */
async function verifyPhoneOtp(req, res, next) {
  const { phone, code } = req.body;

  try {
    // Find the latest active code for this phone
    const query = `
      SELECT id, expires_at FROM phone_verifications
      WHERE phone = ? AND code = ? AND verified = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
    const [rows] = await pool.query(query, [phone, code]);

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
      UPDATE phone_verifications
      SET verified = TRUE
      WHERE id = ?
    `;
    await pool.query(updateQuery, [record.id]);

    return res.status(200).json({
      success: true,
      message: 'Teléfono verificado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Setup provider profile account (Step 2)
 */
async function setupProvider(req, res, next) {
  const files = req.files || {};
  const {
    warehouse_id,
    short_name,
    store_url,
    advisor_phone,
    advisor_whatsapp,
    store_address,
    store_city,
    specialty,
    description,
    received_advisor_assistance,
    registrar_name
  } = req.body;

  try {
    // 1. Basic validation of required body parameters
    if (!warehouse_id) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'El ID de almacén (warehouse_id) es requerido.' });
    }

    if (!short_name || !store_url || !advisor_phone || !advisor_whatsapp || !store_address || !store_city || !specialty || !description || !registrar_name) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'Todos los campos obligatorios del paso 2 deben ser provistos.' });
    }

    // 2. Validate that required files were uploaded
    const requiredFiles = ['rut_doc', 'id_doc', 'chamber_of_commerce_doc', 'registrar_photo'];
    const missingFiles = requiredFiles.filter(field => !files[field] || files[field].length === 0);

    if (missingFiles.length > 0) {
      deleteUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: `Faltan documentos obligatorios por cargar: ${missingFiles.join(', ')}.`
      });
    }

    // 3. Verify warehouse exists and has no pre-existing provider profile
    const [warehouses] = await pool.query('SELECT id FROM warehouses WHERE id = ?', [warehouse_id]);
    if (warehouses.length === 0) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'El almacén indicado no existe.' });
    }

    const [existingProfiles] = await pool.query('SELECT id FROM provider_profiles WHERE warehouse_id = ?', [warehouse_id]);
    if (existingProfiles.length > 0) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'Este almacén ya tiene una cuenta de proveedor configurada.' });
    }

    // 4. Verify that the advisor_whatsapp phone has been verified in DB
    const checkPhoneQuery = `
      SELECT id FROM phone_verifications
      WHERE phone = ? AND verified = TRUE AND created_at >= NOW() - INTERVAL 1 HOUR
      LIMIT 1
    `;
    const [phoneVerifications] = await pool.query(checkPhoneQuery, [advisor_whatsapp]);
    if (phoneVerifications.length === 0) {
      deleteUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: 'El teléfono de WhatsApp del asesor no ha sido verificado. Por favor valídelo primero.'
      });
    }

    // 5. Save file paths (store relative paths to publicize/serve them easily)
    const logo_path = files.logo ? `/uploads/${files.logo[0].filename}` : null;
    const rut_doc_path = `/uploads/${files.rut_doc[0].filename}`;
    const id_doc_path = `/uploads/${files.id_doc[0].filename}`;
    const chamber_of_commerce_doc_path = `/uploads/${files.chamber_of_commerce_doc[0].filename}`;
    const registrar_photo_path = `/uploads/${files.registrar_photo[0].filename}`;

    const isAssisted = received_advisor_assistance === 'true' || received_advisor_assistance === true || received_advisor_assistance === '1';

    // 6. Insert profile into database
    const insertQuery = `
      INSERT INTO provider_profiles (
        warehouse_id, short_name, store_url, advisor_phone, advisor_whatsapp,
        store_address, store_city, specialty, description, logo_path,
        rut_doc_path, id_doc_path, chamber_of_commerce_doc_path, registrar_photo_path,
        received_advisor_assistance, registrar_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      warehouse_id,
      short_name,
      store_url,
      advisor_phone,
      advisor_whatsapp,
      store_address,
      store_city,
      specialty,
      description,
      logo_path,
      rut_doc_path,
      id_doc_path,
      chamber_of_commerce_doc_path,
      registrar_photo_path,
      isAssisted,
      registrar_name
    ]);

    return res.status(201).json({
      success: true,
      message: 'Cuenta de proveedor configurada con éxito.',
      data: {
        id: result.insertId,
        warehouse_id,
        short_name,
        store_url
      }
    });
  } catch (error) {
    // Delete files in case of exceptions/db errors
    deleteUploadedFiles(files);
    next(error);
  }
}

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtp,
  setupProvider
};
