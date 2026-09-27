import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import ServerWakeGate from './ServerWakeGate.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ServerWakeGate>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ServerWakeGate>
  </React.StrictMode>,
);
