// Database connection module using mysql2
// Connects to the MySQL / MariaDB database (XAMPP)

const mysql = require('mysql2/promise');
// dotenv already loaded by server.js - no need to load again

// Database configuration from .env
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'ai_store',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(DB_CONFIG);

// Create the database itself if it does not exist yet
// (the pool below needs the database to exist, so use a separate connection without "database")
const ensureDatabase = async () => {
  const { database, ...noDb } = DB_CONFIG;
  const conn = await mysql.createConnection({
    host: noDb.host, port: noDb.port, user: noDb.user, password: noDb.password
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }
};

// Test the connection
const testConnection = async () => {
  try {
    await ensureDatabase();
    await pool.query('SELECT 1 AS test');
    console.log('✅ Database connection successful');
    console.log(`   Database: ${DB_CONFIG.database}`);
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Add the newer columns (api_keys.*, users.profile_json) to databases created before they existed
const migrateApiKeyColumns = async () => {
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'api_keys'",
    [DB_CONFIG.database]
  );
  const have = new Set(cols.map(c => c.COLUMN_NAME));
  if (!have.has('key_fingerprint')) {
    await pool.query('ALTER TABLE api_keys ADD COLUMN key_fingerprint CHAR(64) NULL AFTER key_salt');
    await pool.query('ALTER TABLE api_keys ADD INDEX idx_key_fingerprint (key_fingerprint)');
    console.log('   Migrated: api_keys.key_fingerprint');
  }
  if (!have.has('key_encrypted')) {
    await pool.query('ALTER TABLE api_keys ADD COLUMN key_encrypted TEXT NULL AFTER key_fingerprint');
    console.log('   Migrated: api_keys.key_encrypted');
  }
  if (!have.has('extra_json')) {
    await pool.query('ALTER TABLE api_keys ADD COLUMN extra_json TEXT NULL AFTER model_preference');
    console.log('   Migrated: api_keys.extra_json');
  }

  const [userCols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
    [DB_CONFIG.database]
  );
  if (!userCols.some(c => c.COLUMN_NAME === 'profile_json')) {
    await pool.query('ALTER TABLE users ADD COLUMN profile_json MEDIUMTEXT NULL AFTER last_login_at');
    console.log('   Migrated: users.profile_json');
  }
};

// Add the device columns to http_sessions on databases created before they existed
const migrateSessionColumns = async () => {
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'http_sessions'",
    [DB_CONFIG.database]
  );
  const have = new Set(cols.map(c => c.COLUMN_NAME));
  const add = [
    ['user_id', 'INT NULL'],
    ['user_agent', 'VARCHAR(255) NULL'],
    ['ip', 'VARCHAR(64) NULL'],
    ['created_at', 'BIGINT NULL'],
    ['last_seen_at', 'BIGINT NULL']
  ];
  for (const [name, type] of add) {
    if (!have.has(name)) {
      await pool.query(`ALTER TABLE http_sessions ADD COLUMN ${name} ${type}`);
      console.log('   Migrated: http_sessions.' + name);
    }
  }
  const [idx] = await pool.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'http_sessions' AND INDEX_NAME = 'idx_http_sessions_user' LIMIT 1",
    [DB_CONFIG.database]
  );
  if (!idx.length) await pool.query('ALTER TABLE http_sessions ADD INDEX idx_http_sessions_user (user_id)');
};

// Initialize database schema from db/schema.sql
const initDatabase = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const schemaText = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

    // Remove "-- comment" lines first, otherwise statements that start with a
    // comment block would be skipped (and no table would ever be created).
    const cleaned = schemaText
      .split(/\r?\n/)
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter(s => !/^(CREATE DATABASE|USE)\b/i.test(s)); // DB already selected by the pool

    for (const statement of statements) {
      await pool.query(statement);
      console.log('   Executed: ' + statement.replace(/\s+/g, ' ').substring(0, 60) + '...');
    }

    await migrateApiKeyColumns();
    await migrateSessionColumns();
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
  }
};

// Get pool instance for use in other modules
module.exports = {
  pool,
  testConnection,
  initDatabase,

  // Helper methods for common queries
  query: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  execute: async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result;
  }
};

// Export the pool for direct use if needed
module.exports.pool = pool;

// Export test function for manual testing
module.exports.testConnection = testConnection;