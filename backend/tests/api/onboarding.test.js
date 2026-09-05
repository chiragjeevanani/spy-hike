import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function customerToken(email = 'hiker_onboard@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
}

async function adminToken(email = 'admin_onboard@findyourtrek.com') {
  await Admin.create({ name: 'Admin', email, passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email, password: 'admin123' });
  return res.body.token;
}

const getPublic = () => request(app).get('/api/v1/onboarding-content');
const getAdmin = (token) => request(app).get('/api/v1/admin/onboarding-content').set('Authorization', `Bearer ${token}`);
const update = (token, body) => request(app).patch('/api/v1/admin/onboarding-content').set('Authorization', `Bearer ${token}`).send(body);

describe('Onboarding content CMS API', () => {
  it('serves default onboarding content publicly without auth', async () => {
    const res = await getPublic();
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();

    // Customer slides check
    expect(res.body.content.customer.visible).toBe(true);
    expect(res.body.content.customer.slides).toHaveLength(3);
    expect(res.body.content.customer.slides[0].title).toBe('Discover Amazing Hiking Adventures');

    // Organizer slides check
    expect(res.body.content.organizer.visible).toBe(true);
    expect(res.body.content.organizer.badgeText).toBe('Organizer Portal');
    expect(res.body.content.organizer.slides).toHaveLength(4);
    expect(res.body.content.organizer.slides[0].title).toBe('Welcome to Find Your Trek Partners');
    expect(res.body.content.organizer.slides[0].perks.length).toBeGreaterThan(0);
  });

  it('allows authenticated admin to read onboarding content', async () => {
    const admin = await adminToken('admin_read@findyourtrek.com');
    const res = await getAdmin(admin);
    expect(res.status).toBe(200);
    expect(res.body.content.customer.slides.length).toBeGreaterThan(0);
    expect(res.body.content.organizer.slides.length).toBeGreaterThan(0);
  });

  it('allows admin to update customer onboarding slides', async () => {
    const admin = await adminToken('admin_cust@findyourtrek.com');
    const newCustomerSlides = [
      {
        title: 'Custom Hiker Title',
        description: 'New custom description for hikers',
        image: 'https://images.unsplash.com/photo-custom?auto=format&fit=crop&w=600',
        icon: 'Sparkles',
        badge: 'New',
      },
    ];

    const patchRes = await update(admin, {
      customer: {
        skipLabel: 'Skip for now',
        slides: newCustomerSlides,
      },
    });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.content.customer.skipLabel).toBe('Skip for now');
    expect(patchRes.body.content.customer.slides).toHaveLength(1);
    expect(patchRes.body.content.customer.slides[0].title).toBe('Custom Hiker Title');

    // Public endpoint reflects changes
    const pub = await getPublic();
    expect(pub.body.content.customer.skipLabel).toBe('Skip for now');
    expect(pub.body.content.customer.slides[0].title).toBe('Custom Hiker Title');
  });

  it('allows admin to update organizer onboarding slides, quotes, and perks', async () => {
    const admin = await adminToken('admin_org@findyourtrek.com');
    const newOrgSlides = [
      {
        title: 'Lead Grand Alpine Expeditions',
        description: 'Reach summit enthusiasts across the globe.',
        image: 'https://images.unsplash.com/photo-org?auto=format&fit=crop&w=600',
        icon: 'Mountain',
        accent: 'text-forest-500',
        bgAccent: 'bg-forest-500/15 border-forest-500/30',
        quote: 'Leading 500+ verified hikers every season with zero friction.',
        perks: ['Guaranteed payout settlement', 'Direct guide walkie-talkie sync'],
      },
    ];

    const patchRes = await update(admin, {
      organizer: {
        badgeText: 'Verified Agency Hub',
        slides: newOrgSlides,
      },
    });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.content.organizer.badgeText).toBe('Verified Agency Hub');
    expect(patchRes.body.content.organizer.slides).toHaveLength(1);
    expect(patchRes.body.content.organizer.slides[0].title).toBe('Lead Grand Alpine Expeditions');
    expect(patchRes.body.content.organizer.slides[0].perks).toEqual([
      'Guaranteed payout settlement',
      'Direct guide walkie-talkie sync',
    ]);

    // Public endpoint reflects updated organizer slides
    const pub = await getPublic();
    expect(pub.body.content.organizer.badgeText).toBe('Verified Agency Hub');
    expect(pub.body.content.organizer.slides[0].quote).toContain('500+ verified hikers');
  });

  it('rejects updates from unauthorized or non-admin users', async () => {
    // Unauthenticated
    const anon = await request(app).patch('/api/v1/admin/onboarding-content').send({ customer: { visible: false } });
    expect(anon.status).toBe(401);

    // Customer role
    const cust = await customerToken('hiker_unauth@example.com');
    const forbidden = await request(app)
      .patch('/api/v1/admin/onboarding-content')
      .set('Authorization', `Bearer ${cust}`)
      .send({ customer: { visible: false } });
    expect(forbidden.status).toBe(403);
  });
});
