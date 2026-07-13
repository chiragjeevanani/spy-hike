import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
}
async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@trekigo.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@trekigo.com', password: 'admin123' });
  return res.body.token;
}
const getPublic = () => request(app).get('/api/v1/landing-content');
const update = (admin, body) => request(app).patch('/api/v1/admin/landing-content').set('Authorization', `Bearer ${admin}`).send(body);

describe('Landing content CMS', () => {
  it('serves default landing content publicly (no auth)', async () => {
    const res = await getPublic();
    expect(res.status).toBe(200);
    expect(res.body.content.hero.titleHighlight).toBe('Verified Guides');
    expect(res.body.content.features.items).toHaveLength(4);
    expect(res.body.content.portals.items.map((p) => p.key)).toEqual(['hiker', 'organizer', 'admin']);
    expect(res.body.content.faq.items.length).toBeGreaterThan(0);
  });

  it('lets an admin update a section and the public read reflects it', async () => {
    const admin = await adminToken();
    const res = await update(admin, { hero: { titleLead: 'Summit the', titleHighlight: 'Roof of the World' } });
    expect(res.status).toBe(200);
    expect(res.body.content.hero.titleHighlight).toBe('Roof of the World');
    // Untouched fields in the same section are preserved (merge, not replace).
    expect(res.body.content.hero.primaryCta).toBe('Launch Hiker App');

    const pub = await getPublic();
    expect(pub.body.content.hero.titleLead).toBe('Summit the');
  });

  it('replaces list content wholesale (add/remove FAQ, features, testimonials)', async () => {
    const admin = await adminToken();
    await update(admin, {
      faq: { items: [{ q: 'Only one now?', a: 'Yes.' }] },
      features: { visible: false },
      testimonials: { items: [] },
    });
    const pub = await getPublic();
    expect(pub.body.content.faq.items).toHaveLength(1);
    expect(pub.body.content.faq.items[0].q).toBe('Only one now?');
    expect(pub.body.content.features.visible).toBe(false);
    expect(pub.body.content.testimonials.items).toHaveLength(0);
  });

  it('rejects landing-content writes from non-admins', async () => {
    const anon = await update(undefined, { hero: { titleLead: 'x' } });
    expect(anon.status).toBe(401);

    const cust = await customerToken();
    const res = await request(app).patch('/api/v1/admin/landing-content').set('Authorization', `Bearer ${cust}`).send({ hero: { titleLead: 'x' } });
    expect(res.status).toBe(403);
  });
});
