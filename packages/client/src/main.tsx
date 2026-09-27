import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'
import App from './App.tsx'
import './index.css'

// Dev only: open with ?noanim to skip all animations. Page transitions wait for animation frames,
// which background/automated browsers don't deliver, so tests would otherwise stall on them.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('noanim')) {
    MotionGlobalConfig.skipAnimations = true
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
