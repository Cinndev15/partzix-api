const express = require('express');
const { getPendingWarehouses, updateWarehouseStatus, getAllWarehouses } = require('../controllers/adminController');
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
 *     description: Lista todos los almacenes registrados que se encuentran esperando aprobación del administrador de la aplicación (estado 'Por Aprobar'). Requiere token Bearer JWT de administrador.
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
 * /api/admin/warehouses/{warehouseId}/status:
 *   post:
 *     summary: Actualiza el estado de aprobación de un almacén (Solo Admin)
 *     description: Permite al administrador aprobar o rechazar (negar) la solicitud de registro de un almacén. Al cambiar de estado, sincroniza el estado de acceso de su cuenta de usuario vinculada. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Administración
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del almacén a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["Aprobado", "Negado"]
 *                 example: "Aprobado"
 *     responses:
 *       200:
 *         description: Estado actualizado con éxito.
 *       400:
 *         description: Estado provisto no válido.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Almacén no encontrado.
 */
router.post('/warehouses/:warehouseId/status', updateWarehouseStatus);

module.exports = router;
