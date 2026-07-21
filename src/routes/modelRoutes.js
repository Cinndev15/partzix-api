const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createModel,
  getModels,
  getModelById,
  updateModel,
  deleteModel
} = require('../controllers/modelController');

const router = express.Router();

/**
 * @openapi
 * /api/models:
 *   post:
 *     summary: Crea un nuevo modelo de vehículo (Solo Admin)
 *     description: Registra un nuevo modelo vinculado a una marca (ej. Mazda 3 bajo la marca Mazda). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Modelos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand_id
 *               - name
 *             properties:
 *               brand_id:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Mazda 3"
 *               description:
 *                 type: string
 *                 example: "Modelo sedán / hatchback compacto."
 *     responses:
 *       201:
 *         description: Modelo creado con éxito.
 *       400:
 *         description: El nombre o ID de marca es requerido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: La marca especificada no existe.
 *   get:
 *     summary: Obtiene la lista de modelos
 *     description: Retorna un listado de todos los modelos registrados. Puede filtrarse por `brandId`. Endpoint público.
 *     tags:
 *       - Modelos
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra los modelos pertenecientes a una marca específica.
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createModel);
router.get('/', getModels);

/**
 * @openapi
 * /api/models/{id}:
 *   get:
 *     summary: Obtiene un modelo por su ID
 *     description: Retorna los detalles del modelo solicitado. Endpoint público.
 *     tags:
 *       - Modelos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del modelo.
 *     responses:
 *       200:
 *         description: Detalles del modelo obtenidos con éxito.
 *       404:
 *         description: Modelo no encontrado.
 *   put:
 *     summary: Actualiza un modelo existente (Solo Admin)
 *     description: Modifica el nombre y descripción de un modelo. Registra al administrador que realizó la edición. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Modelos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del modelo a actualizar.
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
 *                 example: "Mazda 3 All-New"
 *               description:
 *                 type: string
 *                 example: "Nueva generación del Mazda 3."
 *     responses:
 *       200:
 *         description: Modelo actualizado con éxito.
 *       400:
 *         description: El nombre es requerido o está duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Modelo no encontrado.
 *   delete:
 *     summary: Elimina un modelo (Solo Admin)
 *     description: Elimina un modelo del sistema por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Modelos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del modelo a eliminar.
 *     responses:
 *       200:
 *         description: Modelo eliminado con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Modelo no encontrado.
 */
router.get('/:id', getModelById);
router.put('/:id', authenticateToken, requireRole('admin'), updateModel);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteModel);

module.exports = router;
