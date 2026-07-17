const { pool } = require('../db/db');

/**
 * Get all warehouses pending approval
 */
async function getPendingWarehouses(req, res, next) {
  try {
    const query = `
      SELECT 
        u.id as user_id, 
        u.email, 
        u.status, 
        u.created_at as registration_date,
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
        w.website
      FROM users u
      INNER JOIN warehouses w ON u.warehouse_id = w.id
      WHERE u.role = 'warehouse' AND u.status = 'pending'
      ORDER BY u.created_at ASC
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
 * Approve a pending warehouse
 */
async function approveWarehouse(req, res, next) {
  const { userId } = req.params;

  try {
    // 1. Verify user exists and is pending
    const [users] = await pool.query('SELECT id, role, status FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    const user = users[0];

    if (user.role !== 'warehouse') {
      return res.status(400).json({
        success: false,
        message: 'El usuario especificado no es un almacén.'
      });
    }

    if (user.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'El almacén ya se encuentra aprobado.'
      });
    }

    // 2. Approve warehouse
    await pool.query("UPDATE users SET status = 'approved' WHERE id = ?", [userId]);

    return res.status(200).json({
      success: true,
      message: 'El almacén ha sido aprobado con éxito. Ahora puede iniciar sesión.'
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
        w.created_at as registration_date,
        COALESCE(u.status, 'pending') as status,
        u.id as user_id
      FROM warehouses w
      LEFT JOIN users u ON u.warehouse_id = w.id
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

module.exports = {
  getPendingWarehouses,
  approveWarehouse,
  getAllWarehouses
};
