const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { uploadProductImages } = require('../middlewares/upload');
const {
  getTaxes,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const router = express.Router();

/**
 * @openapi
 * /api/products/taxes:
 *   get:
 *     summary: Obtiene la lista de impuestos disponibles
 *     description: Retorna un listado de todos los impuestos configurados en el sistema (ej. IVA 19%, IVA 5%, Exento).
 *     tags:
 *       - Productos
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.get('/taxes', getTaxes);

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Crea un nuevo producto (Admin o Almacén)
 *     description: Registra un nuevo producto (repuesto) con detalles básicos, ficha técnica, compatibilidades (modelos, años, cilindraje), impuestos y subida de múltiples fotos. Requiere multipart/form-data.
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - commercial_name
 *               - stock_units
 *               - sale_price
 *               - category_id
 *             properties:
 *               sku:
 *                 type: string
 *                 example: "KP-8947-SH"
 *               commercial_name:
 *                 type: string
 *                 example: "Bomba de Freno Hidráulica"
 *               factory_reference:
 *                 type: string
 *                 example: "191201-B"
 *               stock_units:
 *                 type: integer
 *                 example: 24
 *               sale_price:
 *                 type: number
 *                 example: 120000
 *               product_brand_id:
 *                 type: integer
 *                 description: ID de la marca de producto (marca fabricante del almacén).
 *                 example: 1
 *               category_id:
 *                 type: integer
 *                 description: ID de la categoría principal.
 *                 example: 1
 *               line_id:
 *                 type: integer
 *                 description: ID de la línea (subcategoría asociada).
 *                 example: 1
 *               subline_id:
 *                 type: integer
 *                 description: ID de la sublínea.
 *                 example: 1
 *               provider_profile_id:
 *                 type: integer
 *                 description: ID del perfil del proveedor.
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: ["Activo (Visible en tienda)", "Borrador", "Inactivo"]
 *                 example: "Activo (Visible en tienda)"
 *               is_featured:
 *                 type: boolean
 *                 example: false
 *               spare_part_type:
 *                 type: string
 *                 enum: ["Original", "Genérico"]
 *                 example: "Genérico"
 *               mechanical_position:
 *                 type: string
 *                 example: "Delantero"
 *               vehicle_side:
 *                 type: string
 *                 example: "Ambos"
 *               compatible_transmission_type:
 *                 type: string
 *                 example: "Mecánica"
 *               technical_description:
 *                 type: string
 *                 example: "Descripción comercial y especificaciones detalladas."
 *               model_ids:
 *                 type: string
 *                 description: Array de IDs de modelos de vehículos compatibles (formato JSON array o separados por comas).
 *                 example: "[1, 2]"
 *               year_ids:
 *                 type: string
 *                 description: Array de IDs de años de compatibilidad (formato JSON array o separados por comas).
 *                 example: "[1, 2]"
 *               displacement_ids:
 *                 type: string
 *                 description: Array de IDs de cilindrajes de compatibilidad (formato JSON array o separados por comas).
 *                 example: "[1]"
 *               tax_ids:
 *                 type: string
 *                 description: Array de IDs de impuestos aplicables (formato JSON array o separados por comas).
 *                 example: "[1]"
 *               warehouse_id:
 *                 type: integer
 *                 description: ID del almacén (Solo requerido para administradores).
 *                 example: 1
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Galería de fotos del producto (hasta 10 fotos).
 *     responses:
 *       201:
 *         description: Producto creado con éxito.
 *       400:
 *         description: Parámetros inválidos o SKU duplicado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: No autorizado.
 *       404:
 *         description: Almacén o categorías no encontradas.
 *   get:
 *     summary: Obtiene listado de productos
 *     description: Retorna listado de productos. Si el rol es almacén, filtra automáticamente para mostrar solo los de su propiedad.
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra los productos de un almacén específico (Solo para administradores).
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra por categoría.
 *       - in: query
 *         name: lineId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra por línea.
 *       - in: query
 *         name: sublineId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra por sublínea.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtra por SKU, Nombre Comercial o Consecutivo.
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.post('/', authenticateToken, uploadProductImages, createProduct);
router.get('/', authenticateToken, getProducts);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Obtiene el detalle de un producto por ID
 *     description: Retorna toda la información de un producto con sus fotos, compatibilidades e impuestos.
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto.
 *     responses:
 *       200:
 *         description: Detalles obtenidos con éxito.
 *       404:
 *         description: Producto no encontrado.
 *   put:
 *     summary: Actualiza un producto existente (Admin o Almacén)
 *     description: Modifica los detalles de un producto. Permite agregar nuevas fotos, remover existentes e incrementar compatibilidades. Requiere multipart/form-data.
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               commercial_name:
 *                 type: string
 *               factory_reference:
 *                 type: string
 *               stock_units:
 *                 type: integer
 *               sale_price:
 *                 type: number
 *               product_brand_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               line_id:
 *                 type: integer
 *               subline_id:
 *                 type: integer
 *               provider_profile_id:
 *                 type: integer
 *               status:
 *                 type: string
 *               is_featured:
 *                 type: boolean
 *               spare_part_type:
 *                 type: string
 *               mechanical_position:
 *                 type: string
 *               vehicle_side:
 *                 type: string
 *               compatible_transmission_type:
 *                 type: string
 *               technical_description:
 *                 type: string
 *               model_ids:
 *                 type: string
 *               year_ids:
 *                 type: string
 *               displacement_ids:
 *                 type: string
 *               tax_ids:
 *                 type: string
 *               delete_image_ids:
 *                 type: string
 *                 description: IDs de imágenes existentes a eliminar (formato JSON array o separados por comas).
 *                 example: "[12, 13]"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Nuevas fotos a agregar.
 *     responses:
 *       200:
 *         description: Producto actualizado con éxito.
 *       404:
 *         description: Producto no encontrado.
 *   delete:
 *     summary: Elimina un producto por ID
 *     description: Borra el producto y todas sus imágenes asociadas del servidor físico y de la base de datos.
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a eliminar.
 *     responses:
 *       200:
 *         description: Producto eliminado con éxito.
 *       404:
 *         description: Producto no encontrado.
 */
router.get('/:id', authenticateToken, getProductById);
router.put('/:id', authenticateToken, uploadProductImages, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

module.exports = router;
