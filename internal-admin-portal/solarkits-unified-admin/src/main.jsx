import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import './index.css'
import App from "./App.jsx"

// NOTE: Each portal manages its own Redux store internally via its own Provider.
// The unified App.jsx just routes to the correct portal — no top-level shared store needed.
// Individual portals (admin, accounts, warehouse, etc.) wrap themselves in <Provider> already.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
