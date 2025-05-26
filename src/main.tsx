import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "./css/buttons.css";
import "./css/tab.css";
import "./css/input.css";
import "./css/scrollbars.css";
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
