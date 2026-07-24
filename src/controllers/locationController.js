const COLOMBIAN_LOCATIONS = [
  { name: 'Antioquia', cities: ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Rionegro', 'Apartadó', 'Envigado'] },
  { name: 'Atlántico', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Sabanagrande'] },
  { name: 'Bogotá D.C.', cities: ['Bogotá'] },
  { name: 'Bolívar', cities: ['Cartagena', 'Magangué', 'Turbaco', 'Arjona'] },
  { name: 'Boyacá', cities: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'] },
  { name: 'Caldas', cities: ['Manizales', 'La Dorada', 'Riosucio', 'Chinchiná'] },
  { name: 'Cundinamarca', cities: ['Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Fusagasugá', 'Girardot', 'Mosquera'] },
  { name: 'Santander', cities: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil'] },
  { name: 'Valle del Cauca', cities: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Yumbo', 'Buga', 'Cartago'] }
];

async function getLocations(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: COLOMBIAN_LOCATIONS
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLocations
};
