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
        // Accent palette — metallic chrome / platinum silver (matches the
        // CMR logo). Key name kept as `gold` so existing classes need no edit.
        gold: {
          50: "#f7f8f9",
          100: "#eceef0",
          200: "#dde0e4",
          300: "#c4c8ce",
          400: "#a9aeb7", // silver — accent text on dark backgrounds
          500: "#cbced4", // light chrome — primary button surface
          600: "#71757e", // graphite — accent text/links on light backgrounds
          700: "#565a62", // dark graphite — links & headings on white
          800: "#3a3d43",
          900: "#26282d",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        elevated: "0 10px 30px -10px rgb(0 0 0 / 0.25)",
        glow: "0 0 50px -12px rgba(203, 206, 212, 0.35)",
        "glow-sm": "0 0 28px -10px rgba(203, 206, 212, 0.3)",
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
