import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Availability API', () => {
  let userToken;
  let userId;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'avail_user@example.com',
      password: 'password123',
      name: 'Avail User',
    });
    const login = await request(app).post('/api/auth/login').send({
      email: 'avail_user@example.com',
      password: 'password123',
    });
    userToken = login.body.data.token;
    userId = login.body.data.user.id;
  });

  it('should upsert availabilities', async () => {
    const res = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slots: [
          { startTime: '2026-06-01T09:00:00Z', endTime: '2026-06-01T17:00:00Z' }
        ]
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.count).toEqual(1);
  });

  it('should retrieve availabilities', async () => {
    const res = await request(app)
      .get('/api/availability')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toEqual(1);
    expect(res.body.data[0].startTime).toEqual('2026-06-01T09:00:00.000Z');
  });

  it('should reject invalid times', async () => {
    const res = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slots: [
          { startTime: '2026-06-01T17:00:00Z', endTime: '2026-06-01T09:00:00Z' }
        ]
      });
    expect(res.statusCode).toEqual(400); // Because endTime < startTime
  });
});
