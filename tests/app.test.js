import request from 'supertest';
import { app } from '../server.js';
import path from 'path';
import fs from 'fs';

describe('Sample DevOps App', () => {
  test('GET /health returns status ok and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  test('GET / serves index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Sample DevOps App/);
  });

  test('GET /api/data returns JSON with app and items', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('app');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('GET /api/info returns app info and stats only', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('app');
    expect(res.body).toHaveProperty('stats');
    expect(res.body).not.toHaveProperty('items');
  });

  test('POST /api/contact validates input', async () => {
    const bad = await request(app).post('/api/contact').send({});
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post('/api/contact')
      .send({ name: 'Test', email: 't@example.com', message: 'Hello' })
      .set('Content-Type', 'application/json');
    expect(ok.status).toBe(404);
  });

  test('GET /metrics returns counters and memory', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('requestCount');
    expect(res.body).toHaveProperty('memory');
  });

  test('Static files are served (css)', async () => {
    const res = await request(app).get('/css/style.css');
    expect([200, 304]).toContain(res.status);
  });

  test('404 returns Not found for API', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});


