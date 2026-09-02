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
        obsidian: {
          DEFAULT: '#090A0F',     // Dark Obsidian base
          elevated: '#0D0F18',    // Deep surface
          card: '#121420',        // Deep Graphite Card
          cardHover: '#171A29',
          border: 'rgba(255, 255, 255, 0.08)',
          borderSubtle: 'rgba(255, 255, 255, 0.04)',
        },
        violet: {
          electric: '#8B5CF6',
          laser: '#7C3AED',
          glow: 'rgba(139, 92, 246, 0.15)'
        },
        laser: {
          green: '#10B981',
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
