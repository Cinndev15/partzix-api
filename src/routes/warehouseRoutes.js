const express = require('express');
const { body, validationResult } = require('express-validator');
const { sendOtp, verifyOtp, registerWarehouse } = require('../controllers/warehouseController');

const router = express.Router();

// Middleware to handle validation results
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
 * Route: Request OTP for email validation
 */
router.post(
  '/send-otp',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail()
  ],
  validate,
  sendOtp
);

/**
 * Route: Verify OTP code
 */
router.post(
  '/verify-otp',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail(),
    body('code')
      .trim()
      .notEmpty().withMessage('El código de verificación es requerido.')
      .isLength({ min: 6, max: 6 }).withMessage('El código debe ser de 6 dígitos.')
      .isNumeric().withMessage('El código debe contener únicamente números.')
  ],
  validate,
  verifyOtp
);

/**
 * Route: Register a new warehouse
 */
router.post(
  '/register',
  [
    body('identification_number')
      .trim()
      .notEmpty().withMessage('El número de identificación es requerido.'),
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre o razón social es requerido.'),
    body('address')
      .trim()
      .notEmpty().withMessage('La dirección es requerida.'),
    body('city')
      .trim()
      .notEmpty().withMessage('La ciudad es requerida.'),
    body('phone')
      .optional({ nullable: true, checkFalsy: true })
      .trim(),
    body('contact_person')
      .optional({ nullable: true, checkFalsy: true })
      .trim(),
    body('user_class')
      .trim()
      .notEmpty().withMessage('La clase de usuario es requerida.'),
    body('website')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isURL().withMessage('La URL del sitio web no es válida.'),
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico es requerido.')
      .isEmail().withMessage('El formato del correo electrónico no es válido.')
      .normalizeEmail()
  ],
  validate,
  registerWarehouse
);

module.exports = router;
