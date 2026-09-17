import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#050811",
        surface: {
          DEFAULT: "#0D1524",
          subtle: "#111C30",
          elevated: "#16233B",
          border: "rgba(56, 189, 248, 0.12)",
        },
        polar: {
          cyan: "#00E5FF",
          sky: "#38BDF8",
          blue: "#0284C7",
          deep: "#0369A1",
        },
        ice: {
          50: "#F0FDF4",
          100: "#E0F2FE",
          400: "#38BDF8",
          500: "#06B6D4",
          600: "#0891B2",
        },
        hazard: {
          50: "#FFF1F2",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
        },
        safety: {
          50: "#ECFDF5",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        warning: {
          50: "#FFFBEB",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glow-cyan": "0 0 20px -3px rgba(0, 229, 255, 0.35)",
        "glow-emerald": "0 0 20px -3px rgba(16, 185, 129, 0.35)",
        "glow-rose": "0 0 20px -3px rgba(244, 63, 94, 0.35)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 12s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
