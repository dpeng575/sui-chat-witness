import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#e23d7c',
      },
      boxShadow: {
        soft: '0 24px 80px rgba(226, 61, 124, 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
