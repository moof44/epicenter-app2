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
    },
  },
  plugins: [],
}
