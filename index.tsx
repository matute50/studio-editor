import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');

// DEBUG: Log inicial para verificar versión desplegada
console.log("APP BOOTSTRAP: VERSIÓN DESPLEGADA ACTIVA - " + new Date().toISOString());
alert("APP BOOTSTRAP: SI VES ESTO, EL DEPLOY ES NUEVO");

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);