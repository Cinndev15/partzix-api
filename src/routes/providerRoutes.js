const express = require('express');
const { uploadFields } = require('../middlewares/upload');
const { setupProvider } = require('../controllers/providerController');

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ProviderSetupSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Cuenta de proveedor configurada con éxito."
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             warehouse_id:
 *               type: integer
 *               example: 2
 *             short_name:
 *               type: string
 *               example: "Mi Tienda Repuestos"
 */

/**
 * @openapi
 * /api/providers/setup:
 *   post:
 *     summary: Configura la cuenta del proveedor (Paso 2)
 *     description: Permite registrar la información detallada del proveedor y subir los documentos requeridos (RUT, ID representante legal, Certificado Cámara de Comercio, logotipo opcional). Se debe enviar como Multipart Form Data.
 *     tags:
 *       - Proveedores (Configuración)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - warehouse_id
 *               - short_name
 *               - advisor_phone
 *               - advisor_whatsapp
 *               - store_address
 *               - department
 *               - store_city
 *               - specialty
 *               - description
 *               - rut_doc
 *               - id_doc
 *               - chamber_of_commerce_doc
 *               - registrar_name
 *             properties:
 *               warehouse_id:
 *                 type: integer
 *                 description: ID del almacén obtenido en el Paso 1.
 *                 example: 1
 *               short_name:
 *                 type: string
 *                 description: Nombre comercial corto.
 *                 example: "Mi Tienda Repuestos"
 *               advisor_phone:
 *                 type: string
 *                 description: Teléfono fijo de contacto del asesor.
 *                 example: "6013204923"
 *               advisor_whatsapp:
 *                 type: string
 *                 description: WhatsApp del asesor.
 *                 example: "+573204923304"
 *               store_address:
 *                 type: string
 *                 description: Dirección de la tienda.
 *                 example: "Calle 100 # 15-20"
 *               country:
 *                 type: string
 *                 description: País de la tienda.
 *                 example: "Colombia"
 *               department:
 *                 type: string
 *                 description: Departamento de la tienda.
 *                 example: "Bogotá D.C."
 *               store_city:
 *                 type: string
 *                 description: Ciudad de la tienda.
 *                 example: "Bogotá, Bogota, Colombia"
 *               specialty:
 *                 type: string
 *                 description: Especialidad en autopartes.
 *                 example: "Frenos y Suspensión"
 *               description:
 *                 type: string
 *                 description: Descripción breve de la empresa (máx. 512 caracteres).
 *                 example: "Empresa familiar con más de 10 años en el mercado de autopartes."
 *               received_advisor_assistance:
 *                 type: string
 *                 enum: ["true", "false"]
 *                 description: Si recibió ayuda de un asesor en el proceso de registro.
 *                 example: "true"
 *               registrar_name:
 *                 type: string
 *                 description: Nombre completo del registrante.
 *                 example: "Carlos Restrepo"
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del logotipo (opcional).
 *               rut_doc:
 *                 type: string
 *                 format: binary
 *                 description: Documento RUT de la empresa (PDF o imagen).
 *               id_doc:
 *                 type: string
 *                 format: binary
 *                 description: Documento de identidad del representante legal por ambos lados (PDF o imagen).
 *               chamber_of_commerce_doc:
 *                 type: string
 *                 format: binary
 *                 description: Certificado de Cámara de Comercio menor a 90 días (PDF o imagen).
 *     responses:
 *       201:
 *         description: Cuenta configurada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderSetupSuccess'
 *       400:
 *         description: Faltan campos obligatorios o archivos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/setup', uploadFields, setupProvider);

module.exports = router;
