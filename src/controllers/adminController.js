const { pool } = require('../db/db');

/**
 * Get all warehouses pending approval
 */
async function getPendingWarehouses(req, res, next) {
  try {
    const query = `
      SELECT 
        w.id as warehouse_id,
        w.identification_number,
        w.name as business_name,
        w.address,
        w.country,
        w.department,
        w.city,
        w.phone,
        w.contact_person,
        w.user_class,
        w.website,
        w.email,
        w.status,
        w.created_at as registration_date,
        u.id as user_id,
        u.email as user_email,
        p.short_name,
        p.advisor_phone,
        p.advisor_whatsapp,
        p.description,
        p.logo_path,
        p.rut_doc_path,
        p.id_doc_path,
        p.chamber_of_commerce_doc_path,
        p.registrar_name
      FROM warehouses w
      LEFT JOIN users u ON u.warehouse_id = w.id
      LEFT JOIN provider_profiles p ON p.warehouse_id = w.id
      WHERE w.status = 'Por Aprobar'
      ORDER BY w.created_at ASC
    `;

    const [rows] = await pool.query(query);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update the status of a registered warehouse (Approve/Deny)
 */
async function updateWarehouseStatus(req, res, next) {
  const { warehouseId } = req.params;
  const { status } = req.body;

  try {
    // Validate status parameter
    const allowedStatuses = ['Aprobado', 'Negado'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser "Aprobado" o "Negado".'
      });
    }

    // 1. Verify warehouse exists
    const [warehouses] = await pool.query('SELECT id, status FROM warehouses WHERE id = ?', [warehouseId]);
    if (warehouses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado.'
      });
    }

    // 2. Update status in warehouses table
    await pool.query('UPDATE warehouses SET status = ? WHERE id = ?', [status, warehouseId]);

    // 3. Keep linked user status in sync (if exists)
    const userStatus = status === 'Aprobado' ? 'approved' : 'suspended';
    await pool.query('UPDATE users SET status = ? WHERE warehouse_id = ?', [userStatus, warehouseId]);

    return res.status(200).json({
      success: true,
      message: `El estado del almacén ha sido actualizado a "${status}" con éxito.`,
      data: {
        warehouse_id: parseInt(warehouseId),
        status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all registered warehouses with status
 */
async function getAllWarehouses(req, res, next) {
  try {
    const query = `
      SELECT 
        w.id as warehouse_id,
        w.identification_number,
        w.name as business_name,
        w.address,
        w.country,
        w.department,
        w.city,
        w.phone,
        w.contact_person,
        w.user_class,
        w.website,
        w.email,
        w.status,
        w.created_at as registration_date,
        u.id as user_id,
        p.short_name,
        p.advisor_phone,
        p.advisor_whatsapp,
        p.description,
        p.logo_path,
        p.rut_doc_path,
        p.id_doc_path,
        p.chamber_of_commerce_doc_path,
        p.registrar_name
      FROM warehouses w
      LEFT JOIN users u ON u.warehouse_id = w.id
      LEFT JOIN provider_profiles p ON p.warehouse_id = w.id
      ORDER BY w.created_at DESC
    `;

    const [rows] = await pool.query(query);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a user account for an approved warehouse
 */
async function createWarehouseUser(req, res, next) {
  const { warehouseId } = req.params;
  const { email, password } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico y la contraseña son requeridos.'
      });
    }

    // 1. Check if warehouse exists and is approved
    const [warehouses] = await pool.query('SELECT id, status, email FROM warehouses WHERE id = ?', [warehouseId]);
    if (warehouses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado.'
      });
    }

    const warehouse = warehouses[0];
    if (warehouse.status !== 'Aprobado') {
      return res.status(400).json({
        success: false,
        message: 'El almacén debe estar Aprobado para crearle un usuario.'
      });
    }

    // 2. Check if a user is already linked to this warehouse
    const [linkedUsers] = await pool.query('SELECT id FROM users WHERE warehouse_id = ?', [warehouseId]);
    if (linkedUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este almacén ya tiene una cuenta de usuario asignada.'
      });
    }

    // 3. Check if email is already registered
    const [emailUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (emailUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico provisto ya está registrado.'
      });
    }

    // 4. Encrypt password and insert user
    const passwordHash = bcrypt.hashSync(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, role, status, warehouse_id) VALUES (?, ?, "warehouse", "approved", ?)',
      [email, passwordHash, warehouseId]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario creado con éxito para el almacén.',
      data: {
        user_id: result.insertId,
        email
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPendingWarehouses,
  updateWarehouseStatus,
  getAllWarehouses,
  createWarehouseUser
};
