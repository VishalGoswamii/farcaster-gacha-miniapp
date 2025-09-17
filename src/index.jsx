// index.jsx (minimal)
import React from 'react';
import { createRoot } from 'react-dom/client';
import { sdk } from '@farcaster/miniapp-sdk';

function App() {
  return <div style={{padding:16,fontFamily:'system-ui'}}>Hello from minimal Mini App</div>;
}

// wait for first paint
const afterFirstPaint = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

async function callReadyOnce(opts) {
  if (window.__miniappReadyCalled) return;
  try {
    console.log('[miniapp] typeof ready =', typeof sdk?.actions?.ready);
    await sdk.actions.ready(opts);
    window.__miniappReadyCalled = true;
    console.log('[miniapp] ready() → OK');
  } catch (e) {
    console.warn('[miniapp] ready() threw:', e);
  }
}
window.__miniappReadyCalled = window.__miniappReadyCalled || false;

(async function boot() {
  const container = document.getElementById('root');
  if (!container) return console.error('No #root in index.html');
  createRoot(container).render(<App />);
  await afterFirstPaint();
  await callReadyOnce();
  setTimeout(() => callReadyOnce(), 1200); // safety net
})();
