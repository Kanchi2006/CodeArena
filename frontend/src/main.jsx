import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext'

const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || ''
).replace(/\/$/, '');

const originalFetch = window.fetch.bind(window);

window.fetch = (input, init) => {
  const requestUrl =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);

  if (requestUrl.startsWith('/api/')) {
    const targetUrl = `${BACKEND_URL}${requestUrl}`;

    if (input instanceof Request) {
      return originalFetch(new Request(targetUrl, input), init);
    }

    return originalFetch(targetUrl, init);
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

