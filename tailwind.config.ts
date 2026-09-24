import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled from logo std.jpg (Société Tunisienne de Décoration)
        brand: {
          50: "#fdf1ec",
          100: "#fbe0d3",
          200: "#f4b8a0",
          300: "#ea8f6c",
          400: "#e26c45",
          500: "#d9491f", // terracotta — primary
          600: "#bd3a17",
          700: "#962e12",
          800: "#70220d",
          900: "#4a1608",
        },
        leaf: {
          50: "#f2f9e8",
          100: "#e1f2c8",
          200: "#c5e592",
          300: "#a8d75c",
          400: "#8bc53f", // leaf green — accent
          500: "#71a831",
          600: "#588327",
          700: "#40601c",
          800: "#2b3f13",
        },
        gold: {
          400: "#d8ae52",
          500: "#c99a2e", // outline gold
          600: "#a97e21",
        },
        ink: {
          DEFAULT: "#2a1a12",
          soft: "#5c4638",
          faint: "#8a7364",
        },
        cream: {
          DEFAULT: "#fbf6ee",
          soft: "#f3ead9",
          line: "#e7d9c3",
        },
      },
      fontFamily: {
        heading: ["Georgia", "Cambria", "serif"],
        body: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        card: "0 2px 10px rgba(42, 26, 18, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
