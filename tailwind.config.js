/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#123B4A',
          900: '#176B87',
          700: '#2A9D8F',
          100: '#D9E3E7',
          50: '#F4F7F8',
        },
        navy: {
          950: '#123B4A',
          900: '#176B87',
          850: '#2B6070',
          800: '#D9E3E7',
          700: '#647780',
        },
        cyan: {
          400: '#2A9D8F',
          500: '#176B87',
          900: '#D9E3E7',
        },
        spill: {
          orange: '#D89B27',
          red: '#C94C4C',
          glow: '#C94C4C',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Space Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'flow-line': 'flowLine 2s linear infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        flowLine: {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' },
        }
      }
    },
  },
  plugins: [],
}
