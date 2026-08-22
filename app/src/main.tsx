import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css?v=31'
import './cards.css?v=31'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=31`).then((registration) => registration.update()))
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
