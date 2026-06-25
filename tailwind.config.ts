import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Colors resolve from themeable CSS vars (see app/globals.css). The
      // `rgb(var(--x) / <alpha-value>)` form preserves Tailwind opacity
      // utilities like `bg-cream-base/85`.
      colors: {
        cream: {
          base: "rgb(var(--cream-base-rgb) / <alpha-value>)",
          raised: "rgb(var(--cream-raised-rgb) / <alpha-value>)",
          deep: "rgb(var(--cream-deep-rgb) / <alpha-value>)",
        },
        espresso: "rgb(var(--espresso-rgb) / <alpha-value>)",
        coffee: {
          DEFAULT: "rgb(var(--coffee-rgb) / <alpha-value>)",
          soft: "rgb(var(--coffee-soft-rgb) / <alpha-value>)",
        },
        olive: {
          DEFAULT: "rgb(var(--olive-rgb) / <alpha-value>)",
          deep: "rgb(var(--olive-deep-rgb) / <alpha-value>)",
          soft: "rgb(var(--olive-soft-rgb) / <alpha-value>)",
        },
        clay: {
          DEFAULT: "rgb(var(--clay-rgb) / <alpha-value>)",
          deep: "rgb(var(--clay-deep-rgb) / <alpha-value>)",
        },
        // Modal/sheet scrim — stays dark in both themes for legibility.
        scrim: "rgb(var(--scrim-rgb) / <alpha-value>)",
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
        hair: "var(--hair)",
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
