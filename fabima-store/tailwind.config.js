/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Thème féminin : les noms de jetons sont conservés, seules les teintes changent.
        ink: { DEFAULT: '#3a1f2d', soft: '#54304a', muted: '#86677a' },     // prune profond (texte, boutons)
        ivory: { DEFAULT: '#fdf7f5', deep: '#f9e9e6', warm: '#f3d9d5' },   // crème rosée (fonds)
        gold: { DEFAULT: '#c48a82', light: '#f0c9c1', dark: '#a0625c', pale: '#fbeeea' }, // rose doré (accents)
        blush: '#f5d5d6',
        mauve: '#b996b8',
        wine: '#b03a64',                                                    // framboise (promos)
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        script: ['"Pinyon Script"', '"Great Vibes"', 'cursive'],
      },
      letterSpacing: { luxe: '0.32em' },
      boxShadow: {
        luxe: '0 30px 60px -28px rgba(120,50,80,.35)',
        soft: '0 14px 40px -18px rgba(120,50,80,.28)',
      },
      transitionTimingFunction: { luxe: 'cubic-bezier(.22,1,.36,1)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'none' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'none' } },
        'slide-in-left': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'none' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        kenburns: { '0%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
        progress: { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
        floaty: { '0%, 100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-10px) rotate(6deg)' } },
        twinkle: { '0%, 100%': { opacity: '.25', transform: 'scale(.8)' }, '50%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .5s ease-out both',
        'slide-in': 'slide-in .45s cubic-bezier(.22,1,.36,1) both',
        'slide-in-left': 'slide-in-left .45s cubic-bezier(.22,1,.36,1) both',
        marquee: 'marquee 40s linear infinite',
        kenburns: 'kenburns 7s ease-out both',
        progress: 'progress 7s linear both',
        floaty: 'floaty 6s ease-in-out infinite',
        twinkle: 'twinkle 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
