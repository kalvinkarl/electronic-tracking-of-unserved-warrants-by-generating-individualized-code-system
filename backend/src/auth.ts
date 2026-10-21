import { randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { Router, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from './config.js';
import { database, type UserRecord } from './database.js';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many login attempts' } },
});

export function createAuthRouter(): Router {
  const router = Router();

  router.get('/csrf', (request, response) => {
    request.session.csrfToken ??= randomBytes(32).toString('hex');
    response.json({ csrfToken: request.session.csrfToken });
  });

  router.post('/login', loginLimiter, async (request, response, next) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Username and password are required' } });
      return;
    }

    try {
      const [users] = await database.execute<UserRecord[]>(
        `SELECT users.id, users.username, users.password_hash, users.display_name,
                roles.role_code
         FROM users
         INNER JOIN roles ON roles.id = users.role_id
         WHERE users.username = ? AND users.is_active = TRUE
         LIMIT 1`,
        [parsed.data.username],
      );
      const user = users[0];
      const passwordMatches = user
        ? await argon2.verify(user.password_hash, parsed.data.password).catch(() => false)
        : false;

      if (!user || !passwordMatches) {
        response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
        return;
      }

      await new Promise<void>((resolve, reject) => {
        request.session.regenerate((error) => error ? reject(error) : resolve());
      });
      request.session.user = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role_code,
      };
      request.session.csrfToken = randomBytes(32).toString('hex');

      response.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role_code,
        },
        csrfToken: request.session.csrfToken,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuthenticated, requireCsrf, (request, response, next) => {
    request.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      response.clearCookie('etugis.sid');
      response.status(204).end();
    });
  });

  router.get('/me', requireAuthenticated, (request, response) => {
    response.json({ user: request.session.user });
  });

  return router;
}

export function requireAuthenticated(request: Request, response: Response, next: NextFunction): void {
  if (!request.session.user) {
    response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in is required' } });
    return;
  }
  next();
}

export function requireCsrf(request: Request, response: Response, next: NextFunction): void {
  const expected = request.session.csrfToken;
  const provided = request.get('x-csrf-token');
  if (!expected || !provided) {
    response.status(403).json({ error: { code: 'CSRF_TOKEN_REQUIRED', message: 'A valid CSRF token is required' } });
    return;
  }

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    response.status(403).json({ error: { code: 'CSRF_TOKEN_INVALID', message: 'A valid CSRF token is required' } });
    return;
  }
  next();
}

export function requireRoles(...roles: string[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.session.user) {
      response.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in is required' } });
      return;
    }
    if (!roles.includes(request.session.user.role)) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not authorized to perform this action' } });
      return;
    }
    next();
  };
}

export const appRoles = {
  peopleReaders: ['ADMIN', 'DATA_STEWARD', 'ENCODER', 'SUPERVISOR', 'WARRANT_SERVER', 'AUDITOR'],
  peopleWriters: ['ADMIN', 'DATA_STEWARD', 'ENCODER'],
} as const;

export const sessionOptions = {
  name: 'etugis.sid',
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 4 * 60 * 60 * 1000,
    path: '/',
  },
};