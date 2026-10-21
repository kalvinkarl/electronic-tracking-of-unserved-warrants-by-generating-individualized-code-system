import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import session from 'express-session';
import { createAuthRouter, sessionOptions } from './auth.js';
import { checkDatabaseConnection, MysqlSessionStore } from './database.js';
import { createPeopleRouter } from './people.js';

type DatabaseProbe = () => Promise<void>;

export function createApp(databaseProbe: DatabaseProbe = checkDatabaseConnection) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '256kb' }));
  app.use(session({ ...sessionOptions, store: new MysqlSessionStore() }));

  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1/people', createPeopleRouter());

  app.get('/api/v1/health/live', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.get('/api/v1/health/ready', async (_request, response) => {
    try {
      await databaseProbe();
      response.status(200).json({ status: 'ready' });
    } catch {
      response.status(503).json({ status: 'unavailable' });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error('Unhandled API error:', error instanceof Error ? error.name : 'UnknownError');
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  };
  app.use(errorHandler);

  return app;
}