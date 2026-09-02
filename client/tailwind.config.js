/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        spectr: {
          bg: '#08090C',         // Ultra-deep charcoal base
          surface: '#0E1017',    // Deep surface
          panel: '#11141F',      // Workstation panels
          panelHover: '#161A29', // Hover state
          border: '#1E2333',     // Precision borders
          borderLight: '#283046',
          violet: '#7C3AED',     // Cyber violet accent
          violetHover: '#6D28D9',
          violetGlow: 'rgba(124, 58, 237, 0.2)',
          terminal: '#10B981',   // Laser terminal green
          amber: '#F59E0B',
          rose: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
