import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Route to the correct module based on URL prefix
const isAdminPath = window.location.pathname.startsWith('/admin');
const isOrganizerPath = window.location.pathname.startsWith('/organizer');

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
      <AppComponent />
    </StrictMode>,
  );
}

bootstrap();

