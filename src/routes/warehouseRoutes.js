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
 * @openapi
 * components:
 *   schemas:
 *     WarehouseRegistration:
 *       type: object
 *       required:
 *         - identification_number
 *         - name
 *         - address
 *         - department
 *         - city
 *         - user_class
 *         - email
 *       properties:
 *         identification_number:
 *           type: string
 *           description: Número de identificación o NIT del almacén.
 *           example: "80065888"
 *         name:
 *           type: string
 *           description: Nombre y apellido o Razón Social de la empresa.
 *           example: "Autopartes La 33"
 *         address:
 *           type: string
 *           description: Dirección física del almacén.
 *           example: "Calle 45 # 12-34"
 *         country:
 *           type: string
 *           description: País del almacén (por defecto Colombia).
 *           example: "Colombia"
 *         department:
 *           type: string
 *           description: Departamento del almacén.
 *           example: "Cundinamarca"
 *         city:
 *           type: string
 *           description: Ciudad o municipio del almacén.
 *           example: "Bogotá"
 *         phone:
 *           type: string
 *           description: Teléfono de contacto.
 *           example: "+57 320 4923304"
 *         contact_person:
 *           type: string
 *           description: Nombre de la persona de contacto.
 *           example: "Felipe Gonzalez"
 *         user_class:
 *           type: string
 *           description: Categoría del usuario.
 *           example: "Empresa de autopartes"
 *         website:
 *           type: string
 *           description: Dirección web del almacén (URL).
 *           example: "https://imotriz.com"
 *         email:
 *           type: string
 *           description: Correo electrónico del almacén (debe ser verificado previamente).
 *           example: "fgonzalez@kayparts.co"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error description details."
 *     ValidationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: "email"
 *               message:
 *                 type: string
 *                 example: "El formato del correo electrónico no es válido."
 */

/**
 * @openapi
 * /api/warehouses/send-otp:
 *   post:
 *     summary: Solicita un código OTP para validar el correo
 *     description: Genera un código OTP de 6 dígitos con vigencia de 15 minutos y lo envía al correo indicado.
 *     tags:
 *       - Almacenes (Registro)
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
 *         description: Código OTP enviado con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Código de verificación enviado con éxito."
 *       400:
 *         description: Parámetros de entrada inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Error al enviar correo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /api/warehouses/verify-otp:
 *   post:
 *     summary: Verifica el código OTP recibido por correo
 *     description: Compara el código OTP provisto por el usuario contra el código guardado. Si coincide y no ha expirado, habilita el correo para el registro.
 *     tags:
 *       - Almacenes (Registro)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 example: "fgonzalez@kayparts.co"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Correo verificado con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Correo electrónico verificado con éxito."
 *       400:
 *         description: Código incorrecto, expirado o error de validación.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /api/warehouses/register:
 *   post:
 *     summary: Registra un nuevo almacén
 *     description: Inserta un nuevo registro de almacén si todos los campos son válidos y el correo electrónico fue previamente verificado a través de OTP.
 *     tags:
 *       - Almacenes (Registro)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WarehouseRegistration'
 *     responses:
 *       201:
 *         description: Almacén creado con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Almacén registrado con éxito."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     identification_number:
 *                       type: string
 *                       example: "80065888"
 *                     name:
 *                       type: string
 *                       example: "Autopartes La 33"
 *                     email:
 *                       type: string
 *                       example: "fgonzalez@kayparts.co"
 *       400:
 *         description: El almacén ya existe, el correo no está verificado o hay un error de validación en los campos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
    body('country')
      .optional()
      .trim(),
    body('department')
      .trim()
      .notEmpty().withMessage('El departamento es requerido.'),
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
