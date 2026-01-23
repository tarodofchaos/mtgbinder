/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // MTG-inspired color palette
        mtg: {
          white: '#f8f6f0',
          blue: '#0e68ab',
          black: '#150b00',
          red: '#d3202a',
          green: '#00733e',
          gold: '#c9a227',
          artifact: '#a5a7a8',
          land: '#956c44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
