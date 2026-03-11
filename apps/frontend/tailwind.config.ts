import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          card: '#1a2332',
          elevated: '#1f2d3d',
        },
        brand: {
          orange: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
          yellow: '#fbbf24',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(245, 158, 11, 0.18)',
        panel: '0 18px 60px rgba(8, 15, 30, 0.55)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at top left, rgba(245,158,11,0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(34,211,238,0.12), transparent 28%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        riseIn: 'riseIn 0.45s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
