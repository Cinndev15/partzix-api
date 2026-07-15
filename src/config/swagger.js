const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Partzix Warehouse API',
    version: '1.0.0',
    description: 'API REST profesional para el registro y gestión de almacenes en Partzix, incluyendo verificación de correo por código OTP.',
    contact: {
      name: 'Soporte Cinndev',
      email: 'fgonzalez@cinndev.co',
    },
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Servidor de Desarrollo Local',
    },
    {
      url: 'https://api.partzix.com',
      description: 'Servidor de Producción',
    }
  ],
};

const options = {
  swaggerDefinition,
  // Path to the API docs
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
