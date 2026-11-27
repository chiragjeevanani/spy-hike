// Test-only server: never connects to Atlas and never sends real SMS/payments.
// Production seed data stays empty; browser fixtures belong only in this file.
process.env.NODE_ENV = 'test';
process.env.OTP_MOCK = 'true';
process.env.OTP_MOCK_CODE = '123456';
process.env.PAYMENT_MODE = 'arrival';
process.env.PAYU_MERCHANT_KEY = '';
process.env.PAYU_MERCHANT_SALT = '';
process.env.FIREBASE_PROJECT_ID = '';
process.env.FIREBASE_CLIENT_EMAIL = '';
process.env.FIREBASE_PRIVATE_KEY = '';
process.env.ADMIN_EMAIL = 'admin@findyourtrek.com';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.JWT_SECRET = 'isolated-e2e-secret';

const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: mongoose } = await import('mongoose');
const { createApp } = await import('../../src/app.js');
const { env } = await import('../../src/config/env.js');
const { upsertAdmin, upsertCategories, upsertCoupons } = await import('../../src/seed.js');
const { default: User } = await import('../../src/models/User.js');
const { default: Trek } = await import('../../src/models/Trek.js');
const { default: Trip } = await import('../../src/models/Trip.js');
const { hashPassword } = await import('../../src/utils/password.js');
const { provisionDepartures } = await import('../../src/services/inventoryService.js');

const { futureDate } = await import('../../../frontend/e2e/fixtures/dates.js');
const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
await upsertAdmin();
await upsertCategories();
await upsertCoupons();
await User.create({ name: 'Chirag Jeevanani', email: 'chiragjeevanani333@gmail.com',
  passwordHash: await hashPassword('findyourtrek123'), isOnboarded: true, profileSetupComplete: true,
  mobile: '9000000001', mobileVerified: true });
await User.create({ name: 'Demo Organizer', email: 'demo@himalayan.com',
  passwordHash: await hashPassword('organizer123'), isOnboarded: true, isOrganizer: true,
  organizer: { agencyName: 'Himalayan Sherpa Guides', isApproved: true, isPendingApproval: false } });
const coverImage = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80';
for (const [id, title] of [
  ['himalayan-ridge-pass-trek', 'Himalayan Ridge Pass Trek'],
  ['valley-of-flowers-scenic-valley', 'Valley of Flowers Scenic Valley'],
]) {
  await Trek.create({ _id: id, title, location: 'Himalayas', state: 'Uttarakhand', city: 'Joshimath',
    difficulty: 'Moderate', durationDays: 5, distanceKm: 20, coverImage, category: 'Trekking', trending: true });
  const trip = await Trip.create({ _id: id, trekId: id, organizerEmail: 'demo@himalayan.com',
    organizer: { name: 'Himalayan Sherpa Guides', rating: 4.9 }, name: title,
    location: 'Himalayas', state: 'Uttarakhand', city: 'Joshimath',
    pricingTiers: [{ label: 'Solo', price: 1000 }], price: 1000,
    departureDates: [futureDate(30), futureDate(44)],
    difficulty: 'Moderate', durationDays: 5, distanceKm: 20, maxGroupSize: 100,
    availableSeats: 100, category: 'Trekking', coverImage, status: 'Published' });
  await provisionDepartures(trip);
}
const server = createApp().listen(env.port, () => console.log(`E2E API ready on ${env.port}`));
async function shutdown() {
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
