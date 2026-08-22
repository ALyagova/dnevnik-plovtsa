import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css?v=30'
import './cards.css?v=30'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`))
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
