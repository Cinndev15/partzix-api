const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
require('dotenv').config();

async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  try {
    // Read schema.sql file
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments and split SQL by semicolons to execute statements individually
    const cleanSql = schemaSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    const connection = await pool.getConnection();

    try {
      for (const statement of statements) {
        // Simple log for tracking progress
        const preview = statement.split('\n')[0].substring(0, 50);
        console.log(`Executing: ${preview}...`);
        await connection.query(statement);
      }
      console.log('✅ Migrations completed successfully.');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

runMigrations();
