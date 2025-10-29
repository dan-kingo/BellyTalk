export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#CD2C58',
          50: '#fef2f4',
          100: '#fde6ea',
          200: '#fcc9d4',
          300: '#f99bb4',
          400: '#f4628d',
          500: '#E06B80',
          600: '#CD2C58',
          700: '#b01d45',
          800: '#93193b',
          900: '#7d1835',
        },
        secondary: {
          DEFAULT: '#E06B80',
          light: '#FFC69D',
          lighter: '#FFE6D4',
        },
        accent: {
          DEFAULT: '#FFC69D',
          light: '#FFE6D4',
        },
      },
    },
  },
  plugins: [],
}
