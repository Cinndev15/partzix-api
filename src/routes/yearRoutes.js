const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createYear,
  getYears,
  getYearById,
  updateYear,
  deleteYear
} = require('../controllers/yearController');

const router = express.Router();

/**
 * @openapi
 * /api/years:
 *   post:
 *     summary: Registra un nuevo año (Solo Admin)
 *     description: Agrega un año a la lista maestra de años (ej. 2005, 2026). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Años
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *             properties:
 *               year:
 *                 type: integer
 *                 example: 2026
 *     responses:
 *       201:
 *         description: Año creado con éxito.
 *       400:
 *         description: El año es requerido, es inválido o ya existe.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *   get:
 *     summary: Obtiene la lista de años registrados
 *     description: Retorna un listado de todos los años ordenados descendentemente. Endpoint público.
 *     tags:
 *       - Años
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createYear);
router.get('/', getYears);

/**
 * @openapi
 * /api/years/{id}:
 *   get:
 *     summary: Obtiene un año por su ID
 *     description: Retorna los detalles del año solicitado. Endpoint público.
 *     tags:
 *       - Años
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del año registrado.
 *     responses:
 *       200:
 *         description: Detalles del año obtenidos con éxito.
 *       404:
 *         description: Año no encontrado.
 *   put:
 *     summary: Actualiza un año existente (Solo Admin)
 *     description: Modifica el valor numérico de un año registrado. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Años
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del año a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *             properties:
 *               year:
 *                 type: integer
 *                 example: 2027
 *     responses:
 *       200:
 *         description: Año actualizado con éxito.
 *       400:
 *         description: Año requerido, inválido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Año no encontrado.
 *   delete:
 *     summary: Elimina un año (Solo Admin)
 *     description: Elimina un año del listado maestro por su ID. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Años
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del año a eliminar.
 *     responses:
 *       200:
 *         description: Año eliminado con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Año no encontrado.
 */
router.get('/:id', getYearById);
router.put('/:id', authenticateToken, requireRole('admin'), updateYear);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteYear);

module.exports = router;
