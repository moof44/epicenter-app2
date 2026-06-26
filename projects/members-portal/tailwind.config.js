/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./projects/members-portal/src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#000000',
        'bg-surface': '#121212',
        'bg-surface-alt': '#1a1a1a',
        'gold-primary': '#D4AF37',
        'gold-light': '#FFD700',
        'gold-dark': '#B8860B',
        'gold-dim': 'rgba(212, 175, 55, 0.15)',
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'scale-up': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in': 'fade-in 0.25s ease-out forwards',
        'scale-up': 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-down': 'slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-blink': 'fade-blink 1.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
