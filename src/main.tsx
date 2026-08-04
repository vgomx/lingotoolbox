import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'lingo-ds/styles.css';
import './styles/app.css';
import { App } from './App';
import { StoreProvider } from './state/store';

// BASE_URL is "/" locally and "/lingotoolbox/" on GitHub Pages; the router follows it.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
