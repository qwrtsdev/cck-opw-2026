/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        thai: ['Noto Sans Thai', 'sans-serif'],
        pixel: ['2005_iannnnnAMD', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


