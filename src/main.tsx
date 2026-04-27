import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  console.log('[ALLO-DEBUG] main.tsx: Starting render...');
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('Root element not found');
  }
  console.log('[ALLO-DEBUG] main.tsx: Root element found, creating React root...');
  const root = createRoot(rootEl);
  console.log('[ALLO-DEBUG] main.tsx: Rendering App...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('[ALLO-DEBUG] main.tsx: render() called successfully');
} catch (error: any) {
  console.error('[ALLO-DEBUG] FATAL ERROR in main.tsx:', error);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `<div style="padding:40px;color:#c00;font-family:monospace;white-space:pre-wrap;background:#fff3f3;border:2px solid red;margin:20px;border-radius:8px"><h2 style="color:red">❌ Erreur fatale au démarrage</h2><pre>${error?.stack || error?.message || String(error)}</pre></div>`;
  }
}