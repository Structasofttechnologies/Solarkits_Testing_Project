/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // SolarKits Brand Colors (Reseller Portal Theme Match)
        primary: {
          DEFAULT: '#253880',
          50:  '#EBF1FF',
          100: '#D6E3FF',
          200: '#ADC7FF',
          300: '#85ABFF',
          400: '#4B80F6',
          500: '#253880',
          600: '#1d2c66',
          700: '#162352',
          800: '#0E1F4A',
          900: '#0A1633',
          hover: '#1d2c66',
          end: '#1d2c66',
        },
        'primary-end': '#1d2c66',
        'primary-hover': '#1d2c66',
        'secondary-hover': '#dd7e13',
        'danger-hover': '#b91c1c',
        'warning-hover': '#d97706',
        'success-hover': '#15803d',
        'info-hover': '#0284c7',
        accent: {
          DEFAULT: '#F49222',
          50:  '#FFF8EC',
          100: '#FEEECA',
          200: '#FDDA8F',
          300: '#FCC554',
          400: '#F49222',
          500: '#E88B0A',
          600: '#C97308',
          700: '#A85C06',
        },
        secondary: {
          DEFAULT: '#f49222',
          hover: '#dd7e13',
          50:  '#FEF9E8',
          100: '#FDF3D1',
          200: '#FBE7A3',
          300: '#F9DB75',
          400: '#f49222',
          500: '#dd7e13',
        },
        sky: {
          solar: '#29ABE2',
          light: '#E0F5FF',
        },
        navy: '#253880',
        solarbg: '#F8FAFC',

        // Store UI & Dashboard Design System Colors
        bg: 'var(--color-bg, #F8FAFC)',
        surface: {
          DEFAULT: 'var(--color-surface, #ffffff)',
          hover: 'var(--color-surface-hover, #f9fafb)',
        },
        border: 'var(--color-border, #e5e7eb)',
        'text-primary': 'var(--color-text-primary, #0f172a)',
        'text-secondary': 'var(--color-text-secondary, #64748b)',
        'text-muted': 'var(--color-text-muted, #94a3b8)',
        'text-inverse': 'var(--color-text-inverse, #ffffff)',

        success: {
          DEFAULT: '#16a34a',
          hover: '#15803d',
          soft: '#f0fdf4',
        },
        warning: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          soft: '#fffbeb',
        },
        danger: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
          soft: '#fef2f2',
        },
        info: {
          DEFAULT: '#0ea5e9',
          hover: '#0284c7',
          soft: '#f0f9ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(21, 101, 192, 0.08)',
        'card-hover': '0 12px 40px rgba(21, 101, 192, 0.18)',
        glow: '0 0 30px rgba(245, 166, 35, 0.35)',
        xs: '0 2px 4px rgba(0, 0, 0, 0.08)',
        sm: '0 4px 8px rgba(0, 0, 0, 0.08)',
        md: '0 6px 16px rgba(0, 0, 0, 0.12)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.16)',
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
