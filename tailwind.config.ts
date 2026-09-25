import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette officielle STD — ne pas sortir de ces couleurs.
        // Rouge logo #C0392B, vert feuilles #7CB342, vert herbe #43A047.
        brand: {
          50: "#fbeeec",
          100: "#f5d6d2",
          200: "#e8aaa2",
          300: "#db7d72",
          400: "#cf5a4b",
          500: "#c0392b", // rouge principal (maison + texte du logo)
          600: "#a52f23",
          700: "#83251c",
          800: "#611b14",
          900: "#3f110d",
        },
        leaf: {
          50: "#f1f8e9",
          100: "#dcedc8",
          200: "#c5e1a5",
          300: "#9ccc65",
          400: "#7cb342", // vert feuilles
          500: "#6ba238",
          600: "#5a8c2f",
          700: "#456c23",
        },
        grass: {
          400: "#66bb6a",
          500: "#43a047", // vert base / herbe
          600: "#388e3c",
          700: "#2e7d32",
        },
        ink: {
          DEFAULT: "#2b2b2b",
          soft: "#5a5a5a",
          faint: "#8a8a8a",
        },
        page: "#fafafa",
        surface: {
          DEFAULT: "#ffffff",
          soft: "#f2f2f2",
        },
        line: "#e6e6e6",
      },
      fontFamily: {
        heading: ["'Cormorant Garamond'", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        md: "12px",
        lg: "18px",
        xl: "24px",
        "2xl": "32px",
      },
      boxShadow: {
        card: "0 2px 14px rgba(43, 43, 43, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
