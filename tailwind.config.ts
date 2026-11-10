import type { Config } from "tailwindcss";

/** Design tokens live here and nowhere else (PRD section 13). */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF7F0", // page
        brand: { DEFAULT: "#E0242A", dark: "#C21D23", soft: "#FFD0D1" }, // primary actions only
        slate: { nav: "#34495E", "nav-dark": "#2B3C4C", "nav-light": "#46607A" },
        ink: { DEFAULT: "#3A3D3E", heading: "#292C2D", muted: "#525656" },
        line: "#D9D5CE",
        // Status colours are never used alone: always paired with an icon and a text label.
        ok: { DEFAULT: "#1E7B4F", soft: "#E4F3EB" },
        warn: { DEFAULT: "#A5600A", soft: "#FCF0D8" },
        danger: { DEFAULT: "#8E1B2B", soft: "#F9E4E6" },
        info: { DEFAULT: "#2A5C8A", soft: "#E3EEF8" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px", ctl: "10px" },
      boxShadow: {
        card: "0 1px 0 rgba(41,44,45,0.04), 0 8px 24px -12px rgba(52,73,94,0.18)",
        pop: "0 20px 48px -16px rgba(41,44,45,0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "sheet-in": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "pop-in": { from: { opacity: "0", transform: "translateY(8px) scale(.98)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in .18s ease-out",
        "sheet-in": "sheet-in .22s cubic-bezier(.2,.8,.2,1)",
        "pop-in": "pop-in .2s cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;
