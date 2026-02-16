import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Esta línea es la más importante, le dice que busque en TODAS las carpetas dentro de app
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
    // Esta busca en tus componentes (Sidebar, etc)
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tus colores personalizados
        'gorilla-dark': '#0E0C15',
        'gorilla-orange': '#F47F20',
        'gorilla-purple': '#8B5CF6',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
};
export default config;