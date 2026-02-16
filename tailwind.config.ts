// tailwind.config.ts
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gorilla-dark': '#0E0C15',    // El negro azulado del fondo
        'gorilla-orange': '#F47F20',  // El naranja vibrante
        'gorilla-purple': '#8B5CF6',  // El lila/morado de los detalles
      },
    },
  },
  plugins: [],
}