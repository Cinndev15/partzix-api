const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_partzix_jwt_key_99';

/**
 * Middleware to authenticate JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Expecting format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso no provisto. Autenticación requerida.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token de acceso inválido o expirado.'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware to restrict access based on roles
 * @param {string} role - Required role ('admin' or 'warehouse')
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado.'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No tienes permisos para realizar esta acción.'
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
