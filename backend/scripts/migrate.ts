import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));
const connection = await mysql.createConnection({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_MIGRATION_USER,
  password: config.DB_MIGRATION_PASSWORD,
  multipleStatements: true,
  charset: 'utf8mb4',
});

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(120) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [existing] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      [file],
    );
    if (existing.length > 0) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
    await connection.query(sql);
    await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
    console.log(`Applied ${file}`);
  }
} finally {
  await connection.end();
}