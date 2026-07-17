const fs = require('fs');
const { pool } = require('../db/db');

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
 * Setup provider profile account (Step 2)
 */
async function setupProvider(req, res, next) {
  const files = req.files || {};
  const {
    warehouse_id,
    short_name,
    advisor_phone,
    advisor_whatsapp,
    store_address,
    country,
    department,
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

    if (!short_name || !advisor_phone || !advisor_whatsapp || !store_address || !department || !store_city || !specialty || !description || !registrar_name) {
      deleteUploadedFiles(files);
      return res.status(400).json({ success: false, message: 'Todos los campos obligatorios del paso 2 deben ser provistos.' });
    }

    // 2. Validate that required files were uploaded (selfie photo removed)
    const requiredFiles = ['rut_doc', 'id_doc', 'chamber_of_commerce_doc'];
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

    // 4. Save file paths (store relative paths to publicize/serve them easily)
    const logo_path = files.logo ? `/uploads/${files.logo[0].filename}` : null;
    const rut_doc_path = `/uploads/${files.rut_doc[0].filename}`;
    const id_doc_path = `/uploads/${files.id_doc[0].filename}`;
    const chamber_of_commerce_doc_path = `/uploads/${files.chamber_of_commerce_doc[0].filename}`;

    const isAssisted = received_advisor_assistance === 'true' || received_advisor_assistance === true || received_advisor_assistance === '1';

    // 5. Insert profile into database (without registrar_photo_path)
    const insertQuery = `
      INSERT INTO provider_profiles (
        warehouse_id, short_name, advisor_phone, advisor_whatsapp,
        store_address, country, department, store_city, specialty, description, logo_path,
        rut_doc_path, id_doc_path, chamber_of_commerce_doc_path,
        received_advisor_assistance, registrar_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      warehouse_id,
      short_name,
      advisor_phone,
      advisor_whatsapp,
      store_address,
      country || 'Colombia',
      department || '',
      store_city,
      specialty,
      description,
      logo_path,
      rut_doc_path,
      id_doc_path,
      chamber_of_commerce_doc_path,
      isAssisted,
      registrar_name
    ]);

    return res.status(201).json({
      success: true,
      message: 'Cuenta de proveedor configurada con éxito.',
      data: {
        id: result.insertId,
        warehouse_id,
        short_name
      }
    });
  } catch (error) {
    // Delete files in case of exceptions/db errors
    deleteUploadedFiles(files);
    next(error);
  }
}

module.exports = {
  setupProvider
};
