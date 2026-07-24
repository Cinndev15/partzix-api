const fs = require('fs');
const path = require('path');

async function getLocations(req, res, next) {
  try {
    const jsonPath = path.join(__dirname, '../config/colombia.json');
    if (!fs.existsSync(jsonPath)) {
      return res.status(500).json({
        success: false,
        message: 'Archivo de ubicaciones no encontrado.'
      });
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const rawData = JSON.parse(fileContent);

    // Map to keep API contract: { name: departamento, cities: ciudades }
    const mapped = rawData.map(item => ({
      name: item.departamento,
      cities: item.ciudades
    }));

    return res.status(200).json({
      success: true,
      data: mapped
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLocations
};
