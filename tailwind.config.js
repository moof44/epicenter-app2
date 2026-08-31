/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'slate-canvas': 'var(--color-canvas)',
        'slate-app': 'var(--color-app)',
        'slate-surface': 'var(--color-surface)',
        'slate-surface-alt': 'var(--color-surface-alt)',
        'slate-input': 'var(--color-surface-input)',

        'slate-border': 'var(--color-border)',
        'slate-border-light': 'var(--color-border-light)',
        'cyan-focus': 'var(--color-border-focus)',

        'cyan-primary': 'var(--color-cyan-primary)',
        'cyan-hover': 'var(--color-cyan-hover)',
        'cyan-light': 'var(--color-cyan-light)',
        'cyan-dim': 'var(--color-cyan-dim)',

        'eagle-gold': 'var(--color-gold-primary)',
        'eagle-gold-light': 'var(--color-gold-light)',
        'eagle-gold-dark': 'var(--color-gold-dark)',
        'eagle-gold-dim': 'var(--color-gold-dim)',

        'mint-success': 'var(--color-success)',
        'mint-dim': 'var(--color-success-dim)',
        'rose-danger': 'var(--color-danger)',
        'rose-dim': 'var(--color-danger-dim)',
        'amber-warn': 'var(--color-warning)',
        'amber-dim': 'var(--color-warning-dim)',

        'text-pure': 'var(--color-text-pure)',
        'text-primary': 'var(--color-text-primary)',
        'text-body': 'var(--color-text-body)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
      },
      fontFamily: {
        sans: ['var(--font-family-sans)'],
        inter: ['var(--font-family-sans)'],
        mono: ['var(--font-family-mono)'],
      },
      fontSize: {
        '2xs': ['var(--font-size-2xs)', { lineHeight: 'var(--line-height-tight)' }],
        'xs': ['var(--font-size-xs)', { lineHeight: 'var(--line-height-snug)' }],
        'sm': ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        'base': ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        'lg': ['var(--font-size-lg)', { lineHeight: 'var(--line-height-snug)' }],
        'xl': ['var(--font-size-xl)', { lineHeight: 'var(--line-height-snug)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],
      },
      height: {
        'header': 'var(--height-header)',
        'bottom-nav': 'var(--height-bottom-nav)',
        'ticker': 'var(--height-ticker)',
        'control-sm': 'var(--height-control-sm)',
        'control-md': 'var(--height-control-md)',
        'control-lg': 'var(--height-control-lg)',
      },
      width: {
        'sidebar': 'var(--width-sidebar)',
        'sidebar-collapsed': 'var(--width-sidebar-collapsed)',
      },
      maxWidth: {
        'login': 'var(--max-width-login-card)',
        'narrow': 'var(--max-width-container-narrow)',
        'standard': 'var(--max-width-container-standard)',
        'wide': 'var(--max-width-container-wide)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-elevated': 'var(--shadow-card-elevated)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
        'glow-gold': 'var(--shadow-glow-gold)',
      },
      zIndex: {
        'header': 'var(--z-index-header)',
        'nav': 'var(--z-index-nav)',
        'sheet': 'var(--z-index-sheet)',
        'modal': 'var(--z-index-modal)',
        'toast': 'var(--z-index-toast)',
      },
    },
  },
  plugins: [],
};
