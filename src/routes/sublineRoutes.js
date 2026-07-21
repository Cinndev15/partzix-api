const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createSubline,
  getSublines,
  getSublineById,
  updateSubline,
  deleteSubline
} = require('../controllers/sublineController');

const router = express.Router();

/**
 * @openapi
 * /api/sublines:
 *   post:
 *     summary: Crea una nueva sublínea (Solo Admin)
 *     description: Registra una nueva sublínea vinculada a una línea (ej. Amortiguador Delantero). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Sublíneas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - line_id
 *               - name
 *             properties:
 *               line_id:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Amortiguador Delantero"
 *               description:
 *                 type: string
 *                 example: "Amortiguadores hidráulicos y de gas para eje delantero."
 *     responses:
 *       201:
 *         description: Sublínea creada con éxito.
 *       400:
 *         description: El nombre o ID de línea es requerido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: La línea especificada no existe.
 *   get:
 *     summary: Obtiene la lista de sublíneas
 *     description: Retorna un listado de todas las sublíneas registradas. Puede filtrarse por `lineId`. Endpoint público.
 *     tags:
 *       - Sublíneas
 *     parameters:
 *       - in: query
 *         name: lineId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las sublíneas pertenecientes a una línea específica.
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createSubline);
router.get('/', getSublines);

/**
 * @openapi
 * /api/sublines/{id}:
 *   get:
 *     summary: Obtiene una sublínea por su ID
 *     description: Retorna los detalles de la sublínea solicitada. Endpoint público.
 *     tags:
 *       - Sublíneas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sublínea.
 *     responses:
 *       200:
 *         description: Detalles de la sublínea obtenidos con éxito.
 *       404:
 *         description: Sublínea no encontrada.
 *   put:
 *     summary: Actualiza una sublínea existente (Solo Admin)
 *     description: Modifica el nombre y descripción de una sublínea. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Sublíneas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sublínea a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Amortiguador Trasero"
 *               description:
 *                 type: string
 *                 example: "Amortiguadores para eje posterior."
 *     responses:
 *       200:
 *         description: Sublínea actualizada con éxito.
 *       400:
 *         description: El nombre es requerido o está duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Sublínea no encontrada.
 *   delete:
 *     summary: Elimina una sublínea (Solo Admin)
 *     description: Elimina una sublínea del sistema por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Sublíneas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sublínea a eliminar.
 *     responses:
 *       200:
 *         description: Sublínea eliminada con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Sublínea no encontrada.
 */
router.get('/:id', getSublineById);
router.put('/:id', authenticateToken, requireRole('admin'), updateSubline);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteSubline);

module.exports = router;
