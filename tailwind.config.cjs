/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--theme-bg)',
          surface: 'var(--theme-surface)',
          border: 'var(--theme-border)',
          text: {
            main: 'var(--theme-text-main)',
            muted: 'var(--theme-text-muted)',
          },
          accent: 'var(--theme-accent)',
          'accent-glow': 'var(--theme-accent-glow)',
        },
      },
    },
  },
  plugins: [],
}
