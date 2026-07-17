import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Route to the correct module based on URL prefix.
// Match the panel namespaces precisely so the customer-facing organizer profile
// (served by the user module at the plural `/organizers/:name`) is NOT swallowed
// by the organizer panel module.
const routePath = window.location.pathname;
const isAdminPath = routePath === '/admin' || routePath.startsWith('/admin/');
const isOrganizerPath = routePath === '/organizer' || routePath.startsWith('/organizer/');

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';

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
          <AppComponent />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

bootstrap();

