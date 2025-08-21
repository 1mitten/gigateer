/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Public Sans', 'system-ui', 'sans-serif'],
        'public-sans': ['Public Sans', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'extrabold': '800',
      },
      colors: {
        primary: {
          50: '#fef1f5',
          100: '#fde4eb',
          200: '#fbc9d8',
          500: '#ea3a73',
          600: '#EA2264',
          700: '#d11b56',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};