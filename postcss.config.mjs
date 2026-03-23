/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // Note the change from "tailwindcss" to "@tailwindcss/postcss"
  },
};

export default config;