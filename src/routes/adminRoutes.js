const express = require('express');
const { getPendingWarehouses, approveWarehouse, getAllWarehouses } = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply authentication and admin role verification globally to all admin routes
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * @openapi
 * /api/admin/warehouses:
 *   get:
 *     summary: Obtiene la lista de todos los almacenes registrados (Solo Admin)
 *     description: Retorna un listado completo de los almacenes creados en la base de datos junto con su estado de aprobación. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Administración
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
router.get('/warehouses', getAllWarehouses);

/**
 * @openapi
 * /api/admin/pending:
 *   get:
 *     summary: Obtiene la lista de almacenes pendientes de aprobación (Solo Admin)
 *     description: Lista todos los almacenes registrados que se encuentran esperando aprobación del administrador de la aplicación. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Administración
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado (no es administrador).
 */
router.get('/pending', getPendingWarehouses);

/**
 * @openapi
 * /api/admin/approve/{userId}:
 *   post:
 *     summary: Aprueba la cuenta de un almacén pendiente (Solo Admin)
 *     description: Activa el estado del usuario del almacén a 'approved', lo que le permite iniciar sesión. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Administración
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario almacén a aprobar.
 *     responses:
 *       200:
 *         description: Almacén aprobado con éxito.
 *       400:
 *         description: El usuario ya está aprobado o no es del rol almacén.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Usuario no encontrado.
 */
router.post('/approve/:userId', approveWarehouse);

module.exports = router;
