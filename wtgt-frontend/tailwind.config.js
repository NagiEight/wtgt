/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      colors: {
        grape: 'rgba(var(--grape))',
      },
    },
  },
  darkMode: 'class',
};

module.exports = config;
