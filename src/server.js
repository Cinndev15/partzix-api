const app = require('./app');
const { testConnection } = require('./db/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Test connection to the database first
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Could not start server because database connection failed.');
    // Optional: exit or let it run depending on deployment configuration.
    // For development, we can still start the server, but let's exit to enforce DB setup.
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();
