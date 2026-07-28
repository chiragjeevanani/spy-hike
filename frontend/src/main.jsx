import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Route to the correct module based on URL prefix.
// Match the panel namespaces precisely so the customer-facing organizer profile
// (served by the user module at the plural `/organizers/:name`) is NOT swallowed
// by the organizer panel module.
const routePath = window.location.pathname;
const isAdminPath = routePath === '/admin' || routePath.startsWith('/admin/');
let isOrganizerPath = routePath === '/organizer' || routePath.startsWith('/organizer/');

// If opening default app root path, check persistent active role
if (!isAdminPath && !isOrganizerPath && (routePath === '/' || routePath === '/app' || routePath === '/app/')) {
  try {
    const activeRole = localStorage.getItem('trekigo_active_role');
    const rawOrgUser = localStorage.getItem('trekigo_org_user');
    if (rawOrgUser) {
      const orgUser = JSON.parse(rawOrgUser);
      if (orgUser?.isAuthenticated && activeRole === 'organizer') {
        isOrganizerPath = true;
        window.history.replaceState(null, '', '/organizer/dashboard');
      }
    }
  } catch (e) {
    console.error('Error checking persistent active role:', e);
  }
}

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import OfflineStatusIndicator from './components/OfflineStatusIndicator';

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

