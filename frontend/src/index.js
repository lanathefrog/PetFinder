import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import 'leaflet/dist/leaflet.css';
import { ToastProvider } from "./components/ToastContext";

import { BrowserRouter } from "react-router-dom";   // 🔥 ДОДАЛИ

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>   {/* 🔥 ОБГОРТАЄМО ВСЕ */}
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();