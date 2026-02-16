/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // <--- ESTA ES LA CLAVE (lleva arroba)
    autoprefixer: {},
  },
};

export default config;