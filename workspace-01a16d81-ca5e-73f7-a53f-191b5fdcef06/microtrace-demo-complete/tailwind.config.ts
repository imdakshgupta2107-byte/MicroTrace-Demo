import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0f2142", 50: "#eef1f6", 100: "#dde4ef", 500: "#1d3d70",
          600: "#16305c", 700: "#101f3d", 800: "#0c1a33", 900: "#081226",
        },
        gold: { DEFAULT: "#d9a226", 600: "#9a7414", 700: "#7f5f0f", 100: "#faf0d7" },
        ink: "#1c2433",
      },
      fontFamily: { sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(15,33,66,.05), 0 2px 8px rgba(15,33,66,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
