/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px -12px rgba(79, 70, 229, 0.25)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at 10% 15%, rgba(99, 102, 241, 0.14), transparent 35%), radial-gradient(circle at 85% 20%, rgba(139, 92, 246, 0.14), transparent 40%), linear-gradient(145deg, #f8fafc 0%, #eef2ff 45%, #f5f3ff 100%)',
      },
    },
  },
  plugins: [],
}
