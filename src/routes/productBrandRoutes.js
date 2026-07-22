const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  createProductBrand,
  getProductBrands,
  getProductBrandById,
  updateProductBrand,
  deleteProductBrand
} = require('../controllers/productBrandController');

const router = express.Router();

/**
 * @openapi
 * /api/product-brands:
 *   post:
 *     summary: Crea una nueva marca de producto (Admin o Almacén)
 *     description: Registra una nueva marca de producto vinculada a un almacén. Si es un usuario de almacén, se vincula automáticamente a su propio almacén. Si es un administrador, debe especificar el `warehouse_id`.
 *     tags:
 *       - Marcas de Producto
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
 *                 example: "Filtros Bosch"
 *               description:
 *                 type: string
 *                 example: "Línea premium de filtros y autopartes Bosch."
 *               warehouse_id:
 *                 type: integer
 *                 description: ID del almacén (Solo requerido/usado si el usuario es administrador).
 *                 example: 1
 *     responses:
 *       201:
 *         description: Marca de producto creada con éxito.
 *       400:
 *         description: El nombre de la marca es requerido, duplicado o falta el warehouse_id para administradores.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: El almacén especificado no existe.
 *   get:
 *     summary: Obtiene la lista de marcas de producto
 *     description: Retorna un listado de marcas de producto. Si el usuario es de almacén, solo se retornan las marcas de su propio almacén. Si el usuario es administrador, puede ver todas o filtrar por `warehouseId`.
 *     tags:
 *       - Marcas de Producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las marcas de un almacén específico (Solo aplicable para rol admin).
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 *       401:
 *         description: No autenticado.
 */
router.post('/', authenticateToken, createProductBrand);
router.get('/', authenticateToken, getProductBrands);

/**
 * @openapi
 * /api/product-brands/{id}:
 *   get:
 *     summary: Obtiene una marca de producto por su ID
 *     description: Retorna los detalles de la marca de producto solicitada. Un usuario de almacén solo puede ver las marcas de su almacén.
 *     tags:
 *       - Marcas de Producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca de producto.
 *     responses:
 *       200:
 *         description: Detalles obtenidos con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado para ver esta marca.
 *       404:
 *         description: Marca de producto no encontrada.
 *   put:
 *     summary: Actualiza una marca de producto existente
 *     description: Modifica el nombre y descripción de una marca de producto. Un usuario de almacén solo puede modificar las marcas de su propio almacén.
 *     tags:
 *       - Marcas de Producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca de producto a actualizar.
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
 *                 example: "Filtros Bosch Editado"
 *               description:
 *                 type: string
 *                 example: "Descripción actualizada."
 *     responses:
 *       200:
 *         description: Marca de producto actualizada con éxito.
 *       400:
 *         description: El nombre es requerido o está duplicado en el almacén.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado para actualizar esta marca.
 *       404:
 *         description: Marca de producto no encontrada.
 *   delete:
 *     summary: Elimina una marca de producto
 *     description: Elimina una marca de producto del sistema por su ID. Un usuario de almacén solo puede eliminar marcas de su propio almacén.
 *     tags:
 *       - Marcas de Producto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca de producto a eliminar.
 *     responses:
 *       200:
 *         description: Marca de producto eliminada con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado para eliminar esta marca.
 *       404:
 *         description: Marca de producto no encontrada.
 */
router.get('/:id', authenticateToken, getProductBrandById);
router.put('/:id', authenticateToken, updateProductBrand);
router.delete('/:id', authenticateToken, deleteProductBrand);

module.exports = router;
