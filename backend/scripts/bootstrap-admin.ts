import { randomUUID } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';
import mysql from 'mysql2/promise';
import argon2 from 'argon2';
import { config } from '../src/config.js';

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (input) => resolve(input.toString().trim()));
  });
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error('Admin bootstrap requires an interactive terminal'));
      return;
    }

    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write(question);
    let value = '';

    const onKeypress = (input: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Admin bootstrap cancelled'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1);
      } else if (input && !key.ctrl) {
        value += input;
      }
    };

    function cleanup(): void {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('keypress', onKeypress);
  });
}

const connection = await mysql.createConnection({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  charset: 'utf8mb4',
});

try {
  const [existingAdmins] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT users.id FROM users
     INNER JOIN roles ON roles.id = users.role_id
     WHERE roles.role_code = 'ADMIN' LIMIT 1`,
  );
  if (existingAdmins.length > 0) {
    throw new Error('An administrator already exists; this bootstrap can only run once');
  }

  const username = await prompt('Administrator username: ');
  const displayName = await prompt('Administrator display name: ');
  const password = await promptHidden('Administrator password (hidden): ');
  const confirmation = await promptHidden('Confirm password (hidden): ');
  if (!/^[A-Za-z0-9._-]{3,100}$/.test(username)) {
    throw new Error('Username must be 3-100 characters using letters, digits, dot, underscore, or hyphen');
  }
  if (!displayName || displayName.length > 160) {
    throw new Error('Display name is required and must be at most 160 characters');
  }
  if (password.length < 14 || password.length > 128 || password !== confirmation) {
    throw new Error('Passwords must match and be between 14 and 128 characters');
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const [roles] = await connection.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM roles WHERE role_code = ?',
    ['ADMIN'],
  );
  const role = roles[0];
  if (!role) {
    throw new Error('Role lookup failed; run npm run db:migrate first');
  }

  await connection.execute(
    `INSERT INTO users (id, role_id, username, password_hash, display_name)
     VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), role.id, username, passwordHash, displayName],
  );
  console.log('Administrator account created. No password was written to the terminal or database in plaintext.');
} finally {
  await connection.end();
}