const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  registerCustomer,
  loginCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');

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
 * /api/customers/register:
 *   post:
 *     summary: Registra un nuevo cliente (Comprador)
 *     description: Crea una cuenta de cliente comprador para el marketplace.
 *     tags:
 *       - Clientes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - phone
 *             properties:
 *               email:
 *                 type: string
 *                 example: "cliente@ejemplo.com"
 *               password:
 *                 type: string
 *                 example: "SeguraPassword123!"
 *               name:
 *                 type: string
 *                 example: "Juan Pérez"
 *               phone:
 *                 type: string
 *                 example: "+57 3001234567"
 *               accept_sms_whatsapp:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Cliente registrado con éxito. Retorna token JWT.
 *       400:
 *         description: Errores de validación o correo duplicado.
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
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre es requerido.'),
    body('phone')
      .trim()
      .notEmpty().withMessage('El teléfono es requerido.'),
    body('accept_sms_whatsapp')
      .optional()
      .isBoolean().withMessage('El consentimiento de SMS/WhatsApp debe ser booleano.')
  ],
  validate,
  registerCustomer
);

/**
 * @openapi
 * /api/customers/login:
 *   post:
 *     summary: Inicia sesión como cliente
 *     description: Autentica al cliente comprador y retorna un token JWT válido por 24 horas.
 *     tags:
 *       - Clientes
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
 *                 example: "cliente@ejemplo.com"
 *               password:
 *                 type: string
 *                 example: "SeguraPassword123!"
 *     responses:
 *       200:
 *         description: Login exitoso. Retorna token JWT.
 *       401:
 *         description: Credenciales inválidas.
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El correo electrónico o teléfono es requerido.'),
    body('password')
      .trim()
      .notEmpty().withMessage('La contraseña es requerida.')
  ],
  validate,
  loginCustomer
);

/**
 * @openapi
 * /api/customers:
 *   get:
 *     summary: Obtiene la lista de clientes (Solo Admin)
 *     description: Retorna un listado de todos los clientes registrados. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Clientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 */
router.get('/', authenticateToken, requireRole('admin'), getCustomers);

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     summary: Obtiene un cliente por su ID
 *     description: Retorna los detalles del perfil del cliente. Requiere token JWT (debe ser Administrador o la cuenta propia).
 *     tags:
 *       - Clientes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente.
 *     responses:
 *       200:
 *         description: Detalles del cliente obtenidos con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: Acceso denegado (no es su cuenta ni es admin).
 *       404:
 *         description: Cliente no encontrado.
 *   put:
 *     summary: Actualiza un cliente existente
 *     description: Modifica el nombre, teléfono y consentimiento de contacto del cliente. Requiere token JWT (debe ser Administrador o la cuenta propia).
 *     tags:
 *       - Clientes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Juan Pérez Modificado"
 *               phone:
 *                 type: string
 *                 example: "+57 3119876543"
 *               accept_sms_whatsapp:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cliente actualizado con éxito.
 *       400:
 *         description: Errores de validación.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: Acceso denegado.
 *       404:
 *         description: Cliente no encontrado.
 *   delete:
 *     summary: Elimina una cuenta de cliente
 *     description: Elimina al cliente del sistema por su ID. Requiere token JWT (debe ser Administrador o la cuenta propia).
 *     tags:
 *       - Clientes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente a eliminar.
 *     responses:
 *       200:
 *         description: Cliente eliminado con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: Acceso denegado.
 *       404:
 *         description: Cliente no encontrado.
 */
router.get('/:id', authenticateToken, getCustomerById);
router.put(
  '/:id',
  authenticateToken,
  [
    body('name').trim().notEmpty().withMessage('El nombre es requerido.'),
    body('phone').trim().notEmpty().withMessage('El teléfono es requerido.'),
    body('accept_sms_whatsapp').optional().isBoolean().withMessage('El consentimiento debe ser booleano.')
  ],
  validate,
  updateCustomer
);
router.delete('/:id', authenticateToken, deleteCustomer);

module.exports = router;
