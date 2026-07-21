const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createLine,
  getLines,
  getLineById,
  updateLine,
  deleteLine
} = require('../controllers/lineController');

const router = express.Router();

/**
 * @openapi
 * /api/lines:
 *   post:
 *     summary: Crea una nueva línea (Solo Admin)
 *     description: Registra una nueva línea de repuestos vinculada a una categoría (ej. Suspensión, Motor). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Líneas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *             properties:
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Suspensión"
 *               description:
 *                 type: string
 *                 example: "Componentes del sistema de suspensión."
 *     responses:
 *       201:
 *         description: Línea creada con éxito.
 *       400:
 *         description: El nombre o ID de categoría es requerido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: La categoría especificada no existe.
 *   get:
 *     summary: Obtiene la lista de líneas
 *     description: Retorna un listado de todas las líneas registradas. Puede filtrarse por `categoryId`. Endpoint público.
 *     tags:
 *       - Líneas
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las líneas pertenecientes a una categoría específica.
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createLine);
router.get('/', getLines);

/**
 * @openapi
 * /api/lines/{id}:
 *   get:
 *     summary: Obtiene una línea por su ID
 *     description: Retorna los detalles de la línea solicitada. Endpoint público.
 *     tags:
 *       - Líneas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la línea.
 *     responses:
 *       200:
 *         description: Detalles de la línea obtenidos con éxito.
 *       404:
 *         description: Línea no encontrada.
 *   put:
 *     summary: Actualiza una línea existente (Solo Admin)
 *     description: Modifica el nombre y descripción de una línea. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Líneas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la línea a actualizar.
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
 *                 example: "Frenos"
 *               description:
 *                 type: string
 *                 example: "Discos, pastillas y mordazas."
 *     responses:
 *       200:
 *         description: Línea actualizada con éxito.
 *       400:
 *         description: El nombre es requerido o está duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Línea no encontrada.
 *   delete:
 *     summary: Elimina una línea (Solo Admin)
 *     description: Elimina una línea de repuestos del sistema por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Líneas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la línea a eliminar.
 *     responses:
 *       200:
 *         description: Línea eliminada con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Línea no encontrada.
 */
router.get('/:id', getLineById);
router.put('/:id', authenticateToken, requireRole('admin'), updateLine);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteLine);

module.exports = router;
