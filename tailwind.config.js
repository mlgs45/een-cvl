/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Charte officielle EEN (Visual Identity Guidelines 2023) ───
        primary: {
          DEFAULT: '#006BA6',   // Mid Blue EEN — boutons, liens actifs
          50:  '#f0f8ff',
          100: '#ddf0fb',
          200: '#b3e0f5',
          300: '#64B4E6',       // Light Blue EEN (fin du gradient Curve)
          400: '#2e9cd4',
          500: '#0080c0',
          600: '#006BA6',       // Mid Blue EEN
          700: '#005a8a',
          800: '#00587C',       // Dark Blue EEN — sidebar, headers
          900: '#003d58',
        },
        // Couleurs sidebar — Dark Blue EEN
        sidebar: {
          DEFAULT: '#00587C',   // Dark Blue EEN
          hover:   '#004d6b',
          border:  '#004d6b',
          text:    '#9ec9e0',   // Bleu clair désaturé
          active:  '#ffffff',
        },
        // Accent jaune EEN
        een: {
          yellow:     '#FFCC00',
          'yellow-50':'#fffbeb',
          blue:       '#006BA6',
          'blue-dark':'#00587C',
          'blue-light':'#64B4E6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        // Gradient iconique EEN "Curve" : Dark Blue → Light Blue
        'een-gradient': 'linear-gradient(135deg, #00587C 0%, #006BA6 50%, #64B4E6 100%)',
        'een-gradient-h': 'linear-gradient(90deg, #00587C 0%, #64B4E6 100%)',
      },
      boxShadow: {
        'card':      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md':   '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'btn':       '0 1px 2px 0 rgb(0 0 0 / 0.08)',
        'topbar':    '0 1px 0 0 rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
