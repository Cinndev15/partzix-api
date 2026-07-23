const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createDisplacement,
  getDisplacements,
  getDisplacementById,
  updateDisplacement,
  deleteDisplacement
} = require('../controllers/displacementController');

const router = express.Router();

/**
 * @openapi
 * /api/displacements:
 *   post:
 *     summary: Crea un nuevo cilindraje (Solo Admin)
 *     description: Registra un nuevo cilindraje vinculado a una categoría. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Cilindrajes
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
 *               - displacement
 *             properties:
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               displacement:
 *                 type: string
 *                 example: "1200cc"
 *               description:
 *                 type: string
 *                 example: "Cilindraje estándar de motores de 1.2 litros."
 *     responses:
 *       201:
 *         description: Cilindraje creado con éxito.
 *       400:
 *         description: El cilindraje o ID de categoría es requerido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: La categoría especificada no existe.
 *   get:
 *     summary: Obtiene la lista de cilindrajes
 *     description: Retorna un listado de todos los cilindrajes registrados. Puede filtrarse por `categoryId`. Endpoint público.
 *     tags:
 *       - Cilindrajes
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra los cilindrajes pertenecientes a una categoría específica.
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createDisplacement);
router.get('/', getDisplacements);

/**
 * @openapi
 * /api/displacements/{id}:
 *   get:
 *     summary: Obtiene un cilindraje por su ID
 *     description: Retorna los detalles del cilindraje solicitado. Endpoint público.
 *     tags:
 *       - Cilindrajes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cilindraje.
 *     responses:
 *       200:
 *         description: Detalles obtenidos con éxito.
 *       404:
 *         description: Cilindraje no encontrado.
 *   put:
 *     summary: Actualiza un cilindraje existente (Solo Admin)
 *     description: Modifica el valor y descripción de un cilindraje. Registra al administrador que realizó la edición. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Cilindrajes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cilindraje a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - displacement
 *             properties:
 *               displacement:
 *                 type: string
 *                 example: "1300cc"
 *               description:
 *                 type: string
 *                 example: "Cilindraje actualizado."
 *     responses:
 *       200:
 *         description: Cilindraje actualizado con éxito.
 *       400:
 *         description: El cilindraje es requerido o está duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Cilindraje no encontrado.
 *   delete:
 *     summary: Elimina un cilindraje (Solo Admin)
 *     description: Elimina un cilindraje del sistema por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Cilindrajes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cilindraje a eliminar.
 *     responses:
 *       200:
 *         description: Cilindraje eliminado con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Cilindraje no encontrado.
 */
router.get('/:id', getDisplacementById);
router.put('/:id', authenticateToken, requireRole('admin'), updateDisplacement);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteDisplacement);

module.exports = router;
