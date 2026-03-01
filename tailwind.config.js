/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tesco: {
          blue: '#003d7a',
          red: '#e51c23',
          white: '#ffffff',
          dark: '#0a0a14',
          darker: '#050508',
        },
        surface: {
          DEFAULT: 'rgba(20, 20, 30, 0.8)',
          light: 'rgba(40, 40, 60, 0.6)',
          border: 'rgba(255, 255, 255, 0.1)',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(229, 28, 35, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(229, 28, 35, 0.5)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
