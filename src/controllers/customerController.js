const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_partzix_jwt_key_99';

/**
 * Register a new customer
 */
async function registerCustomer(req, res, next) {
  const { email, password, name, phone, accept_sms_whatsapp } = req.body;

  try {
    // 1. Check if email already registered
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado como cliente.'
      });
    }

    // 2. Hash password
    const passwordHash = bcrypt.hashSync(password, 10);
    const acceptConsent = accept_sms_whatsapp === true || accept_sms_whatsapp === 'true';

    // 3. Insert into DB
    const insertQuery = `
      INSERT INTO customers (email, password_hash, name, phone, accept_sms_whatsapp)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertQuery, [email, passwordHash, name, phone, acceptConsent]);

    // 4. Generate JWT token for immediate login after registration
    const token = jwt.sign(
      {
        id: result.insertId,
        email: email,
        role: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Cliente registrado con éxito.',
      token,
      data: {
        id: result.insertId,
        email,
        name,
        phone,
        accept_sms_whatsapp: acceptConsent
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login customer
 */
async function loginCustomer(req, res, next) {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE email = ? OR phone = ?', [email, email]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    const customer = rows[0];
    const passwordMatch = bcrypt.compareSync(password, customer.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    const token = jwt.sign(
      {
        id: customer.id,
        email: customer.email,
        role: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión de cliente exitoso.',
      token,
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        role: 'customer'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all customers (Admin only)
 */
async function getCustomers(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT id, email, name, phone, accept_sms_whatsapp, created_at, updated_at FROM customers ORDER BY created_at DESC');
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer by ID
 */
async function getCustomerById(req, res, next) {
  const id = parseInt(req.params.id);

  // Authorization check: Admin or the customer themselves
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. No autorizado para ver este perfil.'
    });
  }

  try {
    const [rows] = await pool.query('SELECT id, email, name, phone, accept_sms_whatsapp, created_at, updated_at FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer
 */
async function updateCustomer(req, res, next) {
  const id = parseInt(req.params.id);
  const { name, phone, accept_sms_whatsapp } = req.body;

  // Authorization check: Admin or the customer themselves
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. No autorizado para modificar este perfil.'
    });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado.'
      });
    }

    const acceptConsent = accept_sms_whatsapp === true || accept_sms_whatsapp === 'true';

    await pool.query(
      'UPDATE customers SET name = ?, phone = ?, accept_sms_whatsapp = ? WHERE id = ?',
      [name, phone, acceptConsent, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Cliente actualizado con éxito.',
      data: {
        id,
        name,
        phone,
        accept_sms_whatsapp: acceptConsent
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete customer
 */
async function deleteCustomer(req, res, next) {
  const id = parseInt(req.params.id);

  // Authorization check: Admin or the customer themselves
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. No autorizado para eliminar esta cuenta.'
    });
  }

  try {
    const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cliente eliminado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerCustomer,
  loginCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
