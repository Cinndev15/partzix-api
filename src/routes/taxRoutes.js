const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const {
  createTax,
  getTaxes,
  getTaxById,
  updateTax,
  deleteTax
} = require('../controllers/taxController');

const router = express.Router();

/**
 * @openapi
 * /api/taxes:
 *   post:
 *     summary: Registra un nuevo impuesto (Solo Admin)
 *     tags:
 *       - Impuestos
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
 *               - rate_percent
 *             properties:
 *               name:
 *                 type: string
 *                 example: "IVA 19%"
 *               rate_percent:
 *                 type: number
 *                 example: 19.00
 *               description:
 *                 type: string
 *                 example: "Impuesto general"
 *     responses:
 *       201:
 *         description: Impuesto creado con éxito.
 *   get:
 *     summary: Obtiene la lista de impuestos registrados
 *     tags:
 *       - Impuestos
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createTax);
router.get('/', getTaxes);

/**
 * @openapi
 * /api/taxes/{id}:
 *   get:
 *     summary: Obtiene un impuesto por su ID
 *     tags:
 *       - Impuestos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalles obtenidos con éxito.
 *   put:
 *     summary: Actualiza un impuesto existente (Solo Admin)
 *     tags:
 *       - Impuestos
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
 *               - rate_percent
 *             properties:
 *               name:
 *                 type: string
 *               rate_percent:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Impuesto actualizado con éxito.
 *   delete:
 *     summary: Elimina un impuesto por ID (Solo Admin)
 *     tags:
 *       - Impuestos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Impuesto eliminado con éxito.
 */
router.get('/:id', getTaxById);
router.put('/:id', authenticateToken, requireRole('admin'), updateTax);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteTax);

module.exports = router;
