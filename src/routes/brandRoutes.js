const express = require('express');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { uploadImportFile } = require('../middlewares/upload');
const {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  updateBrandStatus,
  importBrands,
  downloadBrandsTemplate,
  importCatalog,
  downloadCatalogTemplate
} = require('../controllers/brandController');

const router = express.Router();

/**
 * @openapi
 * /api/brands/import:
 *   post:
 *     summary: Importa marcas de vehículos desde Excel (.xlsx, .xls) o CSV (.csv) (Solo Admin)
 *     description: Permite la carga masiva de marcas de vehículos mediante archivo Excel o CSV. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Marcas
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
 *                 description: Archivo Excel (.xlsx, .xls) o CSV (.csv) con las marcas a importar.
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
 *                   example: "Proceso de importación finalizado. Se importaron 10 marcas nuevas (2 duplicadas omitidas)."
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_rows:
 *                       type: integer
 *                       example: 12
 *                     imported:
 *                       type: integer
 *                       example: 10
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
router.post('/import', authenticateToken, requireRole('admin'), uploadImportFile, importBrands);

/**
 * @openapi
 * /api/brands/import/template:
 *   get:
 *     summary: Descarga la plantilla de importación de marcas
 *     description: Genera y descarga un archivo Excel (.xlsx) o CSV (.csv) de ejemplo con las columnas y formatos requeridos para importar marcas.
 *     tags:
 *       - Marcas
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
router.get('/import/template', downloadBrandsTemplate);

/**
 * @openapi
 * /api/brands/import/catalog:
 *   post:
 *     summary: Importa catálogo completo (Marcas y Modelos) desde Excel o CSV (Solo Admin)
 *     description: Permite importar en un solo archivo marcas y modelos. Si la marca no existe bajo la categoría, se crea automáticamente. Requiere token Bearer JWT de administrador.
 *     tags:
 *       - Marcas
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
 *                 description: Archivo Excel o CSV con catálogo de marcas y modelos.
 *     responses:
 *       200:
 *         description: Proceso de importación finalizado.
 *       400:
 *         description: Archivo inválido.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 */
router.post('/import/catalog', authenticateToken, requireRole('admin'), uploadImportFile, importCatalog);

/**
 * @openapi
 * /api/brands/import/catalog-template:
 *   get:
 *     summary: Descarga la plantilla del catálogo completo (Marcas y Modelos)
 *     description: Descarga una plantilla de ejemplo en Excel o CSV para importar marcas y modelos juntos.
 *     tags:
 *       - Marcas
 *     parameters:
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [xlsx, csv]
 *           default: xlsx
 *         description: Formato del archivo (xlsx o csv).
 *     responses:
 *       200:
 *         description: Plantilla descargada con éxito.
 */
router.get('/import/catalog-template', downloadCatalogTemplate);

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
router.patch('/:id/status', authenticateToken, requireRole('admin'), updateBrandStatus);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteBrand);

module.exports = router;

