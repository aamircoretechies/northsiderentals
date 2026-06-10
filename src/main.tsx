import '@/components/keenicons/assets/styles.css';
import './css/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { assertProductionEnv } from '@/lib/production-audit';
import { App } from './App';

if (import.meta.env.PROD) {
  assertProductionEnv();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
