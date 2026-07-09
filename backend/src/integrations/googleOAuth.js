// Google OAuth provider interface. Callers depend only on verifyIdToken()
// returning a normalized profile, so a real google-auth-library verification
// can replace the fake without touching the auth controller.
//
// Fake implementation: accepts any non-empty token. If the token is a JSON
// string carrying an email (what our frontend "Sign in with Google" stub
// sends), that email is used; otherwise a fixed demo profile is returned.

export const googleProvider = {
  async verifyIdToken(token) {
    if (!token) throw new Error('Missing Google token');

    try {
      const parsed = JSON.parse(token);
      if (parsed && parsed.email) {
        return {
          email: String(parsed.email).toLowerCase(),
          name: parsed.name || 'Google Hiker',
          avatar: parsed.avatar || '',
        };
      }
    } catch {
      /* token wasn't JSON — fall through to the demo profile */
    }

    return {
      email: 'demo.google@trekigo.com',
      name: 'Google Hiker',
      avatar: '',
    };
  },
};

export default googleProvider;
