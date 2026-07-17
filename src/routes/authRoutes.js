const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registra un usuario para un almacén registrado (Paso 3 opcional o credenciales)
 *     description: Asigna una contraseña de acceso al correo electrónico de un almacén creado en el Paso 1. La cuenta queda en estado 'pending'.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - warehouse_id
 *             properties:
 *               email:
 *                 type: string
 *                 example: "fgonzalez@kayparts.co"
 *               password:
 *                 type: string
 *                 example: "SeguraPassword123!"
 *               warehouse_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Usuario registrado con éxito. Pendiente de aprobación.
 *       400:
 *         description: Errores de validación o almacén no existe.
 */
router.post(
  '/register',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail(),
    body('password')
      .trim()
      .notEmpty().withMessage('La contraseña es requerida.')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    body('warehouse_id')
      .notEmpty().withMessage('El ID de almacén (warehouse_id) es requerido.')
      .isInt().withMessage('El ID del almacén debe ser un número entero.')
  ],
  validate,
  register
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión en la aplicación
 *     description: Autentica al usuario (admin o almacén) y retorna un token JWT válido por 24 horas. Los almacenes deben estar aprobados para iniciar sesión.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@partzix.com"
 *               password:
 *                 type: string
 *                 example: "AdminPartzix2026!"
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna token JWT.
 *       401:
 *         description: Credenciales inválidas.
 *       403:
 *         description: Cuenta no aprobada o suspendida.
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail(),
    body('password')
      .trim()
      .notEmpty().withMessage('La contraseña es requerida.')
  ],
  validate,
  login
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicita un código para recuperar la contraseña
 *     description: Genera un código OTP de 6 dígitos con validez de 15 minutos y lo envía al correo si este se encuentra registrado.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "fgonzalez@kayparts.co"
 *     responses:
 *       200:
 *         description: Solicitud procesada con éxito.
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail()
  ],
  validate,
  forgotPassword
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablece la contraseña de la cuenta
 *     description: Recibe el código OTP de recuperación enviado al correo para asignar una nueva contraseña de acceso.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - new_password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "fgonzalez@kayparts.co"
 *               code:
 *                 type: string
 *                 example: "123456"
 *               new_password:
 *                 type: string
 *                 example: "NuevaPassword123!"
 *     responses:
 *       200:
 *         description: Contraseña restablecida con éxito.
 *       400:
 *         description: Código incorrecto o expirado.
 */
router.post(
  '/reset-password',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail(),
    body('code')
      .trim()
      .notEmpty().withMessage('El código de recuperación es requerido.')
      .isLength({ min: 6, max: 6 }).withMessage('El código debe ser de 6 dígitos.')
      .isNumeric().withMessage('El código debe contener únicamente números.'),
    body('new_password')
      .trim()
      .notEmpty().withMessage('La nueva contraseña es requerida.')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
  ],
  validate,
  resetPassword
);

module.exports = router;
