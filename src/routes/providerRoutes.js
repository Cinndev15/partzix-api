const express = require('express');
const { body, validationResult } = require('express-validator');
const { uploadFields } = require('../middlewares/upload');
const { setupProvider, sendPhoneOtp, verifyPhoneOtp } = require('../controllers/providerController');

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
 * /api/providers/send-phone-otp:
 *   post:
 *     summary: Solicita un código OTP para validar el teléfono/WhatsApp
 *     description: Genera un código OTP de 6 dígitos con vigencia de 15 minutos y lo envía al WhatsApp indicado. En entorno de desarrollo se loguea en consola.
 *     tags:
 *       - Proveedores (Configuración)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+573204923304"
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
 *                   example: "Código de verificación de teléfono enviado con éxito."
 */
router.post(
  '/send-phone-otp',
  [
    body('phone')
      .trim()
      .notEmpty().withMessage('El número de teléfono es requerido.')
  ],
  validate,
  sendPhoneOtp
);

/**
 * @openapi
 * /api/providers/verify-phone-otp:
 *   post:
 *     summary: Verifica el código OTP recibido por teléfono/WhatsApp
 *     description: Compara el código OTP provisto por el usuario contra el código guardado. Si coincide y no ha expirado, habilita el teléfono para el registro.
 *     tags:
 *       - Proveedores (Configuración)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+573204923304"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Teléfono verificado con éxito.
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
 *                   example: "Teléfono verificado con éxito."
 */
router.post(
  '/verify-phone-otp',
  [
    body('phone')
      .trim()
      .notEmpty().withMessage('El número de teléfono es requerido.'),
    body('code')
      .trim()
      .notEmpty().withMessage('El código de verificación es requerido.')
      .isLength({ min: 6, max: 6 }).withMessage('El código debe ser de 6 dígitos.')
      .isNumeric().withMessage('El código debe contener únicamente números.')
  ],
  validate,
  verifyPhoneOtp
);

/**
 * @openapi
 * /api/providers/setup:
 *   post:
 *     summary: Configura la cuenta del proveedor (Paso 2)
 *     description: Permite registrar la información detallada del proveedor y subir los documentos requeridos. Requiere que advisor_whatsapp haya sido verificado previamente por OTP.
 *     tags:
 *       - Proveedores (Configuración)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - warehouse_id
 *               - short_name
 *               - store_url
 *               - advisor_phone
 *               - advisor_whatsapp
 *               - store_address
 *               - store_city
 *               - specialty
 *               - description
 *               - rut_doc
 *               - id_doc
 *               - chamber_of_commerce_doc
 *               - registrar_photo
 *               - registrar_name
 *             properties:
 *               warehouse_id:
 *                 type: integer
 *                 description: ID del almacén obtenido en el Paso 1.
 *                 example: 1
 *               short_name:
 *                 type: string
 *                 example: "Mi Tienda Repuestos"
 *               store_url:
 *                 type: string
 *                 example: "https://www.imotriz.com/tienda/mi-tienda"
 *               advisor_phone:
 *                 type: string
 *                 example: "6013204923"
 *               advisor_whatsapp:
 *                 type: string
 *                 description: WhatsApp del asesor (Debe coincidir con el verificado).
 *                 example: "+573204923304"
 *               store_address:
 *                 type: string
 *                 example: "Calle 100 # 15-20"
 *               store_city:
 *                 type: string
 *                 example: "Bogotá, Bogota, Colombia"
 *               specialty:
 *                 type: string
 *                 example: "Frenos y Suspensión"
 *               description:
 *                 type: string
 *                 example: "Empresa familiar con más de 10 años en el mercado de autopartes."
 *               received_advisor_assistance:
 *                 type: string
 *                 enum: ["true", "false"]
 *                 example: "true"
 *               registrar_name:
 *                 type: string
 *                 example: "Carlos Restrepo"
 *               logo:
 *                 type: string
 *                 format: binary
 *               rut_doc:
 *                 type: string
 *                 format: binary
 *               id_doc:
 *                 type: string
 *                 format: binary
 *               chamber_of_commerce_doc:
 *                 type: string
 *                 format: binary
 *               registrar_photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Cuenta configurada con éxito.
 *       400:
 *         description: Teléfono no verificado, faltan archivos o datos.
 */
router.post('/setup', uploadFields, setupProvider);

module.exports = router;
