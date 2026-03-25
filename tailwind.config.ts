import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'z-darker':  '#090d16',
        'z-dark':    '#0f1623',
        'z-mid':     '#1a2235',
        'z-card':    '#1e2a3d',
        'z-surface': '#243046',
        'z-light':   '#e8edf5',
        'z-soft':    '#c4cdd9',
        'z-muted':   '#8896aa',
        'z-dim':     '#4d6070',
        'z-green':   '#00C48C',
        'z-orange':  '#FF6B35',
      },
      fontFamily: {
        head: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm':  '8px',
        'DEFAULT': '12px',
        'md':  '14px',
        'lg':  '18px',
        'xl':  '22px',
        '2xl': '28px',
        'full': '9999px',
      },
      boxShadow: {
        'green-sm': '0 4px 16px rgba(0, 196, 140, 0.2)',
        'green':    '0 6px 24px rgba(0, 196, 140, 0.3)',
        'green-lg': '0 8px 36px rgba(0, 196, 140, 0.35)',
        'card':     '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-lg':  '0 8px 40px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #00C48C, #00a876)',
        'gradient-card': 'linear-gradient(145deg, #1e2a3d, #1a2235)',
        'gradient-dark': 'linear-gradient(180deg, #1a2235, #0f1623)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'pulse-green': 'pulseGreen 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 196, 140, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(0, 196, 140, 0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config