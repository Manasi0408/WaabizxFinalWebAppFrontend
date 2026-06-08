/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        wbx: {
          bg: 'var(--wbx-bg)',
          'bg-elevated': 'var(--wbx-bg-elevated)',
          surface: 'var(--wbx-surface)',
          'surface-raised': 'var(--wbx-surface-raised)',
          'surface-hover': 'var(--wbx-surface-hover)',
          border: 'var(--wbx-border)',
          'border-soft': 'var(--wbx-border-soft)',
          text: 'var(--wbx-text)',
          'text-secondary': 'var(--wbx-text-secondary)',
          'text-muted': 'var(--wbx-text-muted)',
          accent: 'var(--wbx-accent)',
          'accent-soft': 'var(--wbx-accent-soft)',
        },
      },
      boxShadow: {
        wbx: 'var(--wbx-shadow)',
        'wbx-sm': 'var(--wbx-shadow-sm)',
        'wbx-lg': 'var(--wbx-shadow-lg)',
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        ':root': {
          '--wbx-bg': '#f8fafc',
          '--wbx-bg-elevated': '#f1f5f9',
          '--wbx-surface': '#ffffff',
          '--wbx-surface-raised': '#f8fafc',
          '--wbx-surface-hover': '#f1f5f9',
          '--wbx-border': '#e2e8f0',
          '--wbx-border-soft': '#f1f5f9',
          '--wbx-text': '#0f172a',
          '--wbx-text-secondary': '#334155',
          '--wbx-text-muted': '#64748b',
          '--wbx-accent': '#0284c7',
          '--wbx-accent-soft': '#0ea5e9',
          '--wbx-shadow-sm': '0 1px 3px rgba(15, 23, 42, 0.06)',
          '--wbx-shadow': '0 4px 24px rgba(15, 23, 42, 0.08)',
          '--wbx-shadow-lg': '0 8px 40px rgba(15, 23, 42, 0.12)',
        },
      });
    },
  ],
};
