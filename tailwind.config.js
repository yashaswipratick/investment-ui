/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        buy:  '#16a34a',
        hold: '#d97706',
        sell: '#dc2626',
        avoid:'#6b7280',
      }
    }
  },
  plugins: []
}
