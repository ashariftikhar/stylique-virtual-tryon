import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#161616',
        ink: '#161616',
        carbon: '#2B3431',
        metal: '#66736F',
        couture: '#E84D78',
        emerald: '#0F9F91',
        champagne: '#C58A1F',
        porcelain: '#F8FAF8',
        mist: '#F2F6F4',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
