import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import session from 'express-session';
import { config } from './config.js';

export const database = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  connectionLimit: config.DB_CONNECTION_LIMIT,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  multipleStatements: false,
});

export async function checkDatabaseConnection(): Promise<void> {
  await database.query('SELECT 1');
}

export interface UserRecord extends RowDataPacket {
  id: string;
  role_code: string;
  username: string;
  password_hash: string;
  display_name: string;
}

interface SessionRow extends RowDataPacket {
  session_data: string;
}

export class MysqlSessionStore extends session.Store {
  override get(
    sessionId: string,
    callback: (error: unknown, session?: session.SessionData | null) => void,
  ): void {
    void database.execute<SessionRow[]>(
      'SELECT session_data FROM sessions WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP(3)',
      [sessionId],
    ).then(([rows]) => {
      const row = rows[0];
      callback(null, row ? JSON.parse(row.session_data) as session.SessionData : null);
    }).catch((error: unknown) => callback(error));
  }

  override set(
    sessionId: string,
    value: session.SessionData,
    callback?: (error?: unknown) => void,
  ): void {
    const expiry = value.cookie.expires ? new Date(value.cookie.expires) : new Date(Date.now() + 4 * 60 * 60 * 1000);
    void database.execute(
      `INSERT INTO sessions (session_id, expires_at, session_data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at), session_data = VALUES(session_data)`,
      [sessionId, expiry, JSON.stringify(value)],
    ).then(() => callback?.()).catch((error: unknown) => callback?.(error));
  }

  override touch(
    sessionId: string,
    value: session.SessionData,
    callback?: (error?: unknown) => void,
  ): void {
    const expiry = value.cookie.expires ? new Date(value.cookie.expires) : new Date(Date.now() + 4 * 60 * 60 * 1000);
    void database.execute(
      'UPDATE sessions SET expires_at = ? WHERE session_id = ?',
      [expiry, sessionId],
    ).then(() => callback?.()).catch((error: unknown) => callback?.(error));
  }

  override destroy(sessionId: string, callback?: (error?: unknown) => void): void {
    void database.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId])
      .then(() => callback?.()).catch((error: unknown) => callback?.(error));
  }
}

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      displayName: string;
      role: string;
    };
    csrfToken?: string;
  }
}