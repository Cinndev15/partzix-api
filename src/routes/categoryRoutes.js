const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Crea una nueva categoría (Solo Admin)
 *     description: Registra una nueva categoría de repuestos (ej. Motos, Vehículos). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Categorías
 *     security:
 *       - bearerAuth: []
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
 *                 example: "Motos"
 *               description:
 *                 type: string
 *                 example: "Categoría de repuestos para motocicletas."
 *     responses:
 *       201:
 *         description: Categoría creada con éxito.
 *       400:
 *         description: El nombre es requerido o ya existe.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *   get:
 *     summary: Obtiene la lista de categorías
 *     description: Retorna un listado de todas las categorías registradas. Endpoint público.
 *     tags:
 *       - Categorías
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createCategory);
router.get('/', getCategories);

/**
 * @openapi
 * /api/categories/{id}:
 *   get:
 *     summary: Obtiene una categoría por su ID
 *     description: Retorna los detalles de la categoría solicitada. Endpoint público.
 *     tags:
 *       - Categorías
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría.
 *     responses:
 *       200:
 *         description: Detalles de la categoría obtenidos con éxito.
 *       404:
 *         description: Categoría no encontrada.
 *   put:
 *     summary: Actualiza una categoría existente (Solo Admin)
 *     description: Modifica el nombre y descripción de una categoría. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Categorías
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría a actualizar.
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
 *                 example: "Vehículos Livianos"
 *               description:
 *                 type: string
 *                 example: "Repuestos para autos familiares."
 *     responses:
 *       200:
 *         description: Categoría actualizada con éxito.
 *       400:
 *         description: El nombre es requerido o está duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Categoría no encontrada.
 *   delete:
 *     summary: Elimina una categoría (Solo Admin)
 *     description: Elimina una categoría del sistema por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Categorías
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría a eliminar.
 *     responses:
 *       200:
 *         description: Categoría eliminada con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Categoría no encontrada.
 */
router.get('/:id', getCategoryById);
router.put('/:id', authenticateToken, requireRole('admin'), updateCategory);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteCategory);

module.exports = router;
