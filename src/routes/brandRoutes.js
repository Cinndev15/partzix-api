const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand
} = require('../controllers/brandController');

const router = Router();

function Router() {
  return express.Router();
}

/**
 * @openapi
 * /api/brands:
 *   post:
 *     summary: Crea una nueva marca de vehículo (Solo Admin)
 *     description: Registra una nueva marca de repuestos vinculada a una categoría (ej. Mazda bajo Vehículos, Yamaha bajo Motos). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Marcas
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
 *                 example: "Mazda"
 *               description:
 *                 type: string
 *                 example: "Marca de vehículos japoneses."
 *     responses:
 *       201:
 *         description: Marca creada con éxito.
 *       400:
 *         description: El nombre o ID de categoría es requerido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: La categoría especificada no existe.
 *   get:
 *     summary: Obtiene la lista de marcas
 *     description: Retorna un listado de todas las marcas registradas. Puede filtrarse por `categoryId`. Endpoint público.
 *     tags:
 *       - Marcas
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las marcas pertenecientes a una categoría específica.
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createBrand);
router.get('/', getBrands);

/**
 * @openapi
 * /api/brands/{id}:
 *   get:
 *     summary: Obtiene una marca por su ID
 *     description: Retorna los detalles de la marca solicitada. Endpoint público.
 *     tags:
 *       - Marcas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca.
 *     responses:
 *       200:
 *         description: Detalles de la marca obtenidos con éxito.
 *       404:
 *         description: Marca no encontrada.
 *   put:
 *     summary: Actualiza una marca existente (Solo Admin)
 *     description: Modifica el nombre y descripción de una marca. Registra al administrador que realizó la edición. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Marcas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca a actualizar.
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
 *                 example: "Toyota"
 *               description:
 *                 type: string
 *                 example: "Marca líder de vehículos."
 *     responses:
 *       200:
 *         description: Marca actualizada con éxito.
 *       400:
 *         description: El nombre es requerido o está duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Marca no encontrada.
 *   delete:
 *     summary: Elimina una marca (Solo Admin)
 *     description: Elimina una marca del sistema por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Marcas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca a eliminar.
 *     responses:
 *       200:
 *         description: Marca eliminada con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Marca no encontrada.
 */
router.get('/:id', getBrandById);
router.put('/:id', authenticateToken, requireRole('admin'), updateBrand);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteBrand);

module.exports = router;
