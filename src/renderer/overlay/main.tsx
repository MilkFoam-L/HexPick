import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/overlay.css';
import '../styles/card.css';
import { OverlayApp } from './OverlayApp';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <OverlayApp />
  </StrictMode>,
);
