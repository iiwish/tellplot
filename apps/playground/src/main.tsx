import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'tellplot/styles.css';

import { App } from './App';
import './playground.css';

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('Playground root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
