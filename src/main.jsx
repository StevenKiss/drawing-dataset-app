// src/main.jsx
import React from 'react';                          // Import react itself
import ReactDOM from 'react-dom/client';            // ReactDOM for rednering our React app into the HTML page
import { BrowserRouter } from 'react-router-dom';   // Browser Router to enable routing based on the URL
import App from './App.jsx';                        // Import main app component
import './index.css'; // Optional: Tailwind/CSS reset

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
