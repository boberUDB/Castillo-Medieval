import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jacquarda-bastarda-9/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/400-italic.css';
import './styles/global.css';
import App from './App';

// el scroll lo controla el recorrido: al recargar, volvemos al punto donde estaba
if ('scrollRestoration' in history) history.scrollRestoration = 'auto';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
