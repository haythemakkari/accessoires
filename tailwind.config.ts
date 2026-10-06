import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14110f",
        sand: { 50: "#faf7f2", 100: "#f3ede3", 200: "#e6dccb", 300: "#d3c3a8" },
        brass: { DEFAULT: "#b08d57", dark: "#8a6c3e", light: "#d9bf8f" },
        clay: "#c4553a",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: { marquee: "marquee 30s linear infinite" },
    },
  },
  plugins: [],
} satisfies Config;
