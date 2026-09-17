/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: {
          DEFAULT: '#1A0B2E',
          light: '#2D1550',
        },
        skillhub: {
          purple: '#7C3AED',
          pink:   '#EC4899',
          dark:   '#1A0B2E',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to bottom right, #7C3AED, #EC4899)',
      },
    },
  },
  plugins: [],
};
