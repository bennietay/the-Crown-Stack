import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crown: {
          navy: "#07111f",
          ink: "#0b1727",
          slate: "#172536",
          mist: "#91a4b8",
          line: "#24364c",
          gold: "#d8b45f",
          champagne: "#f4dfad",
          rose: "#c99084",
          emerald: "#56b892"
        }
      },
      boxShadow: {
        glow: "0 22px 80px rgba(216, 180, 95, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
