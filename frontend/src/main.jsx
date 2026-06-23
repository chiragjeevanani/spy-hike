import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// Route to the correct module based on URL prefix
const isOrganizerPath = window.location.pathname.startsWith('/organizer');

async function bootstrap() {
  let AppComponent;
  if (isOrganizerPath) {
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

