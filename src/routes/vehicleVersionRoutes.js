const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { uploadImportFile } = require('../middlewares/upload');
const {
  createVersion,
  getVersions,
  getVersionById,
  updateVersion,
  deleteVersion,
  updateVersionStatus,
  importVersions,
  downloadVersionsTemplate
} = require('../controllers/vehicleVersionController');

const router = express.Router();

/**
 * @openapi
 * /api/vehicle-versions/import:
 *   post:
 *     summary: Importa versiones de vehículos desde Excel (.xlsx, .xls) o CSV (.csv) (Solo Admin)
 *     description: Permite la carga masiva de versiones de vehículos vinculadas a su modelo mediante archivo Excel o CSV. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Versiones de Vehículos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel (.xlsx, .xls) o CSV (.csv) con las versiones a importar.
 *     responses:
 *       200:
 *         description: Proceso de importación finalizado con detalle de filas procesadas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Proceso de importación finalizado. Se importaron 15 versiones nuevas (2 duplicadas omitidas)."
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_rows:
 *                       type: integer
 *                       example: 17
 *                     imported:
 *                       type: integer
 *                       example: 15
 *                     skipped:
 *                       type: integer
 *                       example: 2
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Archivo no enviado o formato no compatible.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado (solo admin).
 */
router.post('/import', authenticateToken, requireRole('admin'), uploadImportFile, importVersions);

/**
 * @openapi
 * /api/vehicle-versions/import/template:
 *   get:
 *     summary: Descarga la plantilla de importación de versiones de vehículos
 *     description: Genera y descarga un archivo Excel (.xlsx) o CSV (.csv) de ejemplo con las columnas y formatos requeridos para importar versiones.
 *     tags:
 *       - Versiones de Vehículos
 *     parameters:
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [xlsx, csv]
 *           default: xlsx
 *         description: Formato de la plantilla a descargar (xlsx o csv).
 *     responses:
 *       200:
 *         description: Archivo binario de plantilla descargado.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/import/template', downloadVersionsTemplate);

/**
 * @openapi
 * /api/vehicle-versions:
 *   post:
 *     summary: Crea una nueva versión de vehículo (Solo Admin)
 *     description: Registra una nueva versión asociada a un modelo de vehículo (ej. XEI 2.0 CVT bajo el modelo Corolla). Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Versiones de Vehículos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_id
 *               - name
 *             properties:
 *               model_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID del modelo de vehículo al que pertenece.
 *               name:
 *                 type: string
 *                 example: "XEI 2.0 CVT"
 *                 description: Nombre o denominación de la versión.
 *               description:
 *                 type: string
 *                 example: "Versión intermedia con caja automática"
 *               status:
 *                 type: string
 *                 enum: [Activo, Inactivo]
 *                 default: Activo
 *     responses:
 *       201:
 *         description: Versión de vehículo creada con éxito.
 *       400:
 *         description: Parámetros requeridos faltantes o versión duplicada bajo el modelo.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: El modelo especificado no existe.
 *   get:
 *     summary: Obtiene la lista de versiones de vehículos
 *     description: Retorna un listado de todas las versiones de vehículos registradas. Puede filtrarse opcionalmente por `modelId`, `brandId`, `categoryId` y `status`. Endpoint público.
 *     tags:
 *       - Versiones de Vehículos
 *     parameters:
 *       - in: query
 *         name: modelId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las versiones pertenecientes a un modelo específico.
 *       - in: query
 *         name: brandId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las versiones pertenecientes a una marca específica.
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las versiones pertenecientes a una categoría específica.
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Activo, Inactivo]
 *         description: Filtra por estado Activo o Inactivo.
 *     responses:
 *       200:
 *         description: Listado de versiones obtenido con éxito.
 */
router.post('/', authenticateToken, requireRole('admin'), createVersion);
router.get('/', getVersions);

/**
 * @openapi
 * /api/vehicle-versions/{id}:
 *   get:
 *     summary: Obtiene una versión de vehículo por su ID
 *     description: Retorna los detalles de la versión solicitada incluyendo información del modelo, marca y categoría. Endpoint público.
 *     tags:
 *       - Versiones de Vehículos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la versión de vehículo.
 *     responses:
 *       200:
 *         description: Detalles de la versión obtenidos con éxito.
 *       404:
 *         description: Versión de vehículo no encontrada.
 *   put:
 *     summary: Actualiza una versión de vehículo existente (Solo Admin)
 *     description: Modifica los datos de una versión de vehículo. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Versiones de Vehículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la versión de vehículo a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               model_id:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "SEG Hybrid 1.8"
 *               description:
 *                 type: string
 *                 example: "Versión híbrida full equipo"
 *               status:
 *                 type: string
 *                 enum: [Activo, Inactivo]
 *                 example: "Activo"
 *     responses:
 *       200:
 *         description: Versión de vehículo actualizada con éxito.
 *       400:
 *         description: Nombre requerido o duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Versión o modelo no encontrado.
 *   delete:
 *     summary: Elimina una versión de vehículo (Solo Admin)
 *     description: Elimina una versión de vehículo del sistema. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Versiones de Vehículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la versión a eliminar.
 *     responses:
 *       200:
 *         description: Versión eliminada con éxito.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Versión de vehículo no encontrada.
 */
router.get('/:id', getVersionById);
router.put('/:id', authenticateToken, requireRole('admin'), updateVersion);

/**
 * @openapi
 * /api/vehicle-versions/{id}/status:
 *   patch:
 *     summary: Cambia el estado de una versión de vehículo (Solo Admin)
 *     description: Actualiza rápidamente el estado entre 'Activo' e 'Inactivo'. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Versiones de Vehículos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la versión de vehículo.
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
 *                 enum: [Activo, Inactivo]
 *                 example: "Inactivo"
 *     responses:
 *       200:
 *         description: Estado actualizado con éxito.
 *       400:
 *         description: Estado inválido.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Versión de vehículo no encontrada.
 */
router.patch('/:id/status', authenticateToken, requireRole('admin'), updateVersionStatus);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteVersion);

module.exports = router;
