// Theme handling removed — project uses a single theme defined in index.css
// Keep a no-op provider and null context to avoid import errors if any
import React from "react"

export const ThemeContext = null

export default function ThemeProvider({ children }) {
  return React.createElement(React.Fragment, null, children)
}
