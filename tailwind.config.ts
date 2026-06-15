import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          base: "#EFE7D6",
          raised: "#F6F0E2",
          deep: "#E6DCC6",
        },
        espresso: "#2A211B",
        coffee: {
          DEFAULT: "#6F5844",
          soft: "#8C7560",
        },
        olive: {
          DEFAULT: "#6E7048",
          deep: "#53552F",
          soft: "#878A5A",
        },
        clay: {
          DEFAULT: "#B0734A",
          deep: "#8A5733",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.14em",
        tightest: "-0.04em",
      },
      borderColor: {
        hair: "rgba(111, 88, 68, 0.22)",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
