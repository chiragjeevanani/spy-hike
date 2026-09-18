import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Route to the correct module based on URL prefix.
// Match the panel namespaces precisely so the customer-facing organizer profile
// (served by the user module at the plural `/organizers/:name`) is NOT swallowed
// by the organizer panel module.
let routePath = window.location.pathname;
let isAdminPath = routePath === '/admin' || routePath.startsWith('/admin/');
let isOrganizerPath = routePath === '/organizer' || routePath.startsWith('/organizer/');

// If opening default app root path, check persistent active role and restore last route
if (!isAdminPath && !isOrganizerPath && (routePath === '/' || routePath === '/app' || routePath === '/app/')) {
  try {
    const activeRole = localStorage.getItem('trekigo_active_role');
    const lastRoute = localStorage.getItem('trekigo_last_route');
    const rawOrgUser = localStorage.getItem('trekigo_org_user');
    const rawUser = localStorage.getItem('trekigo_user');

    if (activeRole === 'organizer' && rawOrgUser) {
      const orgUser = JSON.parse(rawOrgUser);
      if (orgUser?.isAuthenticated) {
        isOrganizerPath = true;
        const target = (lastRoute && lastRoute.startsWith('/organizer')) ? lastRoute : '/organizer/dashboard';
        window.history.replaceState(null, '', target);
        routePath = target;
      }
    } else if (rawUser) {
      const hikerUser = JSON.parse(rawUser);
      if (hikerUser?.isAuthenticated) {
        // '/app' IS the home route (see APP_PREFIX in modules/user/App.jsx);
        // '/app/home' is not one the router recognises.
        const target = (lastRoute && (lastRoute.startsWith('/app') || lastRoute.startsWith('/profile'))) ? lastRoute : '/app';
        window.history.replaceState(null, '', target);
        routePath = target;
      }
    }
  } catch (e) {
    console.error('Error checking persistent active role & route:', e);
  }
}

// Global page visibility and lifecycle listeners to persist current route when app is backgrounded
const saveCurrentRoute = () => {
  try {
    const p = window.location.pathname;
    if (p && p !== '/' && p !== '/login') {
      localStorage.setItem('trekigo_last_route', p);
    }
  } catch (e) {}
};

window.addEventListener('pagehide', saveCurrentRoute);
window.addEventListener('beforeunload', saveCurrentRoute);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveCurrentRoute();
  }
});

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import OfflineStatusIndicator from './components/OfflineStatusIndicator';
import { installOverscrollGuard } from './utils/preventOverscrollBounce';
import { installIOSInputFocusFix } from './utils/iosInputFocus';
import { installKeyboardDebug } from './utils/kbDebug';

// Blocks iOS Safari's native rubber-band bounce / pull-to-refresh at the
// touch level — see the file for why the CSS-only fix (index.css) isn't
// enough on iPhone specifically. #root already exists (static markup in
// index.html), so this can run before React even mounts.
installOverscrollGuard();

// Keeps the iOS keyboard open when moving between input fields, so the page
// doesn't drop and jump back on every field switch — see the file for details.
installIOSInputFocusFix();

// Temporary on-device keyboard diagnostics — off unless toggled on (see file).
installKeyboardDebug();

// Register service worker for offline page caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  });
}

async function bootstrap() {
  let AppComponent;
  if (isAdminPath) {
    const mod = await import('./modules/admin/App');
    AppComponent = mod.default;
  } else if (isOrganizerPath) {
    const mod = await import('./modules/organizer/App');
    AppComponent = mod.default;
  } else {
    const mod = await import('./modules/user/App');
    AppComponent = mod.default;
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <OfflineStatusIndicator />
          <AppComponent />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

bootstrap();

