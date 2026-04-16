import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Meetings API', () => {
  let adminToken, userToken, user2Token;
  let adminId, userId, user2Id;

  beforeAll(async () => {
    // Note: use different unique emails per test file if running inBand, or Prisma tearDown covers it.
    // We already use beforeAll tearDown in setup.js meaning DB is clean before tests.
    
    // Register Admin
    const adminRes = await request(app).post('/api/auth/register').send({
      email: 'm_admin@example.com', password: 'password123', name: 'Admin', role: 'ADMIN'
    });
    adminId = adminRes.body.data.id;
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'm_admin@example.com', password: 'password123'});
    adminToken = adminLogin.body.data.token;

    // Register User 1
    const userRes = await request(app).post('/api/auth/register').send({
      email: 'm_user1@example.com', password: 'password123', name: 'User 1'
    });
    userId = userRes.body.data.id;
    const userLogin = await request(app).post('/api/auth/login').send({ email: 'm_user1@example.com', password: 'password123'});
    userToken = userLogin.body.data.token;

    // Register User 2
    const user2Res = await request(app).post('/api/auth/register').send({
      email: 'm_user2@example.com', password: 'password123', name: 'User 2'
    });
    user2Id = user2Res.body.data.id;
    const user2Login = await request(app).post('/api/auth/login').send({ email: 'm_user2@example.com', password: 'password123'});
    user2Token = user2Login.body.data.token;
  });

  let meetingId;

  it('should create a meeting as ADMIN', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Project Kickoff',
        startTime: '2026-07-01T09:00:00Z',
        endTime: '2026-07-01T10:00:00Z',
        participantIds: [userId]
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.data.participants.length).toEqual(1);
    meetingId = res.body.data.id;
  });

  it('should deny USER from creating a meeting', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Unauthorized Meeting',
        startTime: '2026-07-01T11:00:00Z',
        endTime: '2026-07-01T12:00:00Z',
        participantIds: [userId]
      });
    expect(res.statusCode).toEqual(403);
  });

  it('should not allow conflicting meetings for participants', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Conflict Meeting',
        startTime: '2026-07-01T09:30:00Z',
        endTime: '2026-07-01T10:30:00Z',
        participantIds: [userId]
      });
    expect(res.statusCode).toEqual(400); // Conflict
  });

  it('should allow adjacent meeting times', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Adjacent Meeting',
        startTime: '2026-07-01T10:00:00Z',
        endTime: '2026-07-01T11:00:00Z',
        participantIds: [userId]
      });
    expect(res.statusCode).toEqual(201); // No conflict if start = previous end
  });

  it('should get meeting by ID for participant', async () => {
    const res = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.id).toEqual(meetingId);
  });

  it('should deny access to meeting if not a participant', async () => {
    const res = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(res.statusCode).toEqual(403);
  });

  it('should respond to invite', async () => {
    const res = await request(app)
      .put(`/api/meetings/${meetingId}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'ACCEPTED' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.participant.status).toEqual('ACCEPTED');
  });

  it('should update a meeting and reset participant status', async () => {
    const res = await request(app)
      .put(`/api/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startTime: '2026-07-01T13:00:00Z',
        endTime: '2026-07-01T14:00:00Z' // Rescheduled
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.status).toEqual('PENDING'); // Reset
    expect(res.body.data.participants[0].status).toEqual('PENDING');
  });

  it('should delete a meeting', async () => {
    const res = await request(app)
      .delete(`/api/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);

    const getRes = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.statusCode).toEqual(404);
  });
});
