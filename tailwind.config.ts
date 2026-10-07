import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14110f",
        sand: { 50: "#faf7f2", 100: "#f3ede3", 200: "#e6dccb", 300: "#d3c3a8" },
        brass: { DEFAULT: "#b08d57", dark: "#7a5e33", light: "#d9bf8f" }, // dark : texte lisible (contraste ≥ 4,5)
        clay: "#b5472c", // texte blanc dessus : contraste ≥ 4,5
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: { marquee: "marquee 30s linear infinite", "fade-in": "fadeIn 0.35s ease-out" },
    },
  },
  plugins: [],
} satisfies Config;
