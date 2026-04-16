import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'USER',
  };

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toEqual(201);
    expect(res.body.data.email).toEqual(testUser.email);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('should not register duplicate email', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toEqual(409);
  });

  it('should login an existing user', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('should not login with invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    });
    expect(res.statusCode).toEqual(401);
  });
});
