import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
        card: "hsl(var(--card))",
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--glow) / 0.15), 0 18px 48px -16px hsl(var(--glow) / 0.45)",
        "glow-lg": "0 0 0 1px hsl(var(--glow) / 0.2), 0 30px 70px -20px hsl(var(--glow) / 0.6)",
        "3d": "0 24px 50px -24px hsl(var(--grad-to) / 0.5)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 10px 30px -10px hsl(var(--glow) / 0.35)" },
          "50%": { boxShadow: "0 18px 50px -12px hsl(var(--glow) / 0.55)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
