import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette officielle STD — ne pas sortir de ces couleurs.
        // Terracotta du logo #C73E1D (cercle + texte), vert feuille #7CB342.
        // Le terracotta porte les boutons et les accents ; le vert reste un
        // accent secondaire (liens, survols, végétal), jamais un aplat.
        brand: {
          50: "#fbf0ec",
          100: "#f6ddd4",
          200: "#ecbbaa",
          300: "#e09880",
          400: "#d66b4b",
          500: "#c73e1d", // terracotta du logo
          600: "#a83318",
          700: "#882913",
          800: "#661f0e",
          900: "#45150a",
        },
        // Pierre et sable : les fonds chauds qui remplacent les aplats verts.
        // C'est la couleur du calcaire, pas un gris froid.
        sable: {
          50: "#faf7f3",
          100: "#f3ece3",
          200: "#e7dbcc",
          300: "#d5c3ac",
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
