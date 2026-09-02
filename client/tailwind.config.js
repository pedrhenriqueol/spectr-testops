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
        pm: {
          orange: '#FF6C37',
          orangeHover: '#E05A2B',
          orangeSubtle: 'rgba(255, 108, 55, 0.12)',
          // Dark canvas (Postman Dark)
          dark: {
            bg: '#1C1C1C',
            surface: '#212121',
            sidebar: '#262626',
            panel: '#262626',
            panelHover: '#2E2E2E',
            border: '#333333',
            borderSubtle: '#2A2A2A',
            text: '#E6E6E6',
            textMuted: '#999999',
            terminal: '#151515',
          },
          // Light canvas (Postman White / Light)
          light: {
            bg: '#FFFFFF',
            surface: '#FFFFFF',
            sidebar: '#F8F9FA',
            panel: '#F8F9FA',
            panelHover: '#F3F4F6',
            border: '#E5E7EB',
            borderSubtle: '#E5E7EB',
            text: '#1F2937',
            textMuted: '#4B5563',
            terminal: '#F3F4F6',
          },
          // Official Postman HTTP Methods
          get: '#0CBB52',
          post: '#FF6C37',
          put: '#097BED',
          delete: '#EB2013',
          patch: '#A657FA',
          options: '#00BCD4',
          head: '#9C27B0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
