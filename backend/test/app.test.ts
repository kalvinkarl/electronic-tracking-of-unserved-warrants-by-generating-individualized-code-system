import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('liveness endpoint does not depend on the database', async () => {
  const app = createApp(async () => {
    throw new Error('database should not be queried');
  });

  const response = await request(app).get('/api/v1/health/live');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('readiness endpoint returns unavailable when the database probe fails', async () => {
  const app = createApp(async () => {
    throw new Error('database unavailable');
  });

  const response = await request(app).get('/api/v1/health/ready');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { status: 'unavailable' });
});

test('people endpoints require authentication before accessing the database', async () => {
  const app = createApp(async () => {
    throw new Error('health probe should not be called');
  });

  const response = await request(app).get('/api/v1/people');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'AUTHENTICATION_REQUIRED');
});

test('unknown API routes return a stable not-found response', async () => {
  const app = createApp(async () => undefined);

  const response = await request(app).get('/api/v1/not-a-route');

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('login rejects malformed credentials before querying the database', async () => {
  const app = createApp(async () => undefined);

  const response = await request(app).post('/api/v1/auth/login').send({ username: '', password: '' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_REQUEST');
});

test('person publication review requires an authenticated supervisor or administrator', async () => {
  const app = createApp(async () => undefined);

  const response = await request(app)
    .post('/api/v1/people/00000000-0000-4000-8000-000000000001/review')
    .send({ decision: 'APPROVE', note: 'Verified against the approved source record.' });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'AUTHENTICATION_REQUIRED');
});