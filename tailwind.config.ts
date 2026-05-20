import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — luxury charcoal + gold
        brand: {
          50: "#f6f6f7",
          100: "#e1e2e5",
          200: "#c3c5cb",
          300: "#9a9da6",
          400: "#6f7280",
          500: "#4f5160",
          600: "#3b3d49",
          700: "#2d2f3a",
          800: "#1f2029",
          900: "#14151c",
          950: "#0b0c11",
        },
        gold: {
          50: "#fbf7ed",
          100: "#f4e9cb",
          200: "#e9d293",
          300: "#dcb75c",
          400: "#d2a23a",
          500: "#c8a45c",
          600: "#a67c2a",
          700: "#825d24",
          800: "#6c4b25",
          900: "#5c4023",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        elevated: "0 10px 30px -10px rgb(0 0 0 / 0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
