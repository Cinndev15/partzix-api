const express = require('express');
const { getLocations } = require('../controllers/locationController');

const router = express.Router();

/**
 * @openapi
 * /api/locations:
 *   get:
 *     summary: Obtiene la lista de departamentos y ciudades de Colombia
 *     description: Retorna un listado estructurado de departamentos colombianos junto con sus respectivos municipios principales.
 *     tags:
 *       - Ubicaciones
 *     responses:
 *       200:
 *         description: Listado obtenido con éxito.
 */
router.get('/', getLocations);

module.exports = router;
