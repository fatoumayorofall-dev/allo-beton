/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16120f', soft: '#2b2420', muted: '#6b615a' },
        ivory: { DEFAULT: '#f8f4ee', deep: '#efe7dc', warm: '#e7dccd' },
        gold: { DEFAULT: '#a8844a', light: '#d8bf8f', dark: '#7d6031', pale: '#f3eadb' },
        blush: '#e8d5c9',
        wine: '#7a1f2b',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { luxe: '0.32em' },
      boxShadow: {
        luxe: '0 30px 60px -30px rgba(22,18,15,.35)',
        soft: '0 12px 40px -18px rgba(22,18,15,.25)',
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
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .5s ease-out both',
        'slide-in': 'slide-in .45s cubic-bezier(.22,1,.36,1) both',
        'slide-in-left': 'slide-in-left .45s cubic-bezier(.22,1,.36,1) both',
        marquee: 'marquee 40s linear infinite',
        kenburns: 'kenburns 7s ease-out both',
        progress: 'progress 7s linear both',
      },
    },
  },
  plugins: [],
};
