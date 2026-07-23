const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const warehouseRoutes = require('./routes/warehouseRoutes');
const providerRoutes = require('./routes/providerRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const lineRoutes = require('./routes/lineRoutes');
const sublineRoutes = require('./routes/sublineRoutes');
const brandRoutes = require('./routes/brandRoutes');
const modelRoutes = require('./routes/modelRoutes');
const yearRoutes = require('./routes/yearRoutes');
const productBrandRoutes = require('./routes/productBrandRoutes');
const displacementRoutes = require('./routes/displacementRoutes');
const productRoutes = require('./routes/productRoutes');

const path = require('path');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

const app = express();

// Trust proxy settings for Cloudflare/Hostinger
app.set('trust proxy', 1);

// Security Middlewares
// Disable contentSecurityPolicy and crossOriginResourcePolicy to allow cross-origin requests and Swagger
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json());

// Serve Static Files (Landing Page & Uploads)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger UI Endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta dirección IP. Por favor intente más tarde.'
  }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit OTP requests to 5 per 15 minutes per IP to prevent abuse
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de solicitudes de código superado. Intente de nuevo en 15 minutos.'
  }
});

// Apply rate limiter specifically to routes
app.use('/api/', apiLimiter);
app.use('/api/warehouses/send-otp', otpLimiter);
app.use('/api/warehouses/verify-otp', otpLimiter);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Verifica el estado del servidor
 *     description: Endpoint público para monitorear el estado de disponibilidad del servidor API.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: El servidor está disponible y operativo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   example: "2026-07-16T03:00:00.000Z"
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/lines', lineRoutes);
app.use('/api/sublines', sublineRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/product-brands', productBrandRoutes);
app.use('/api/displacements', displacementRoutes);
app.use('/api/products', productRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado.'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Ocurrió un error interno en el servidor.' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message
  });
});

module.exports = app;
