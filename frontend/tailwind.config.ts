import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        rail: "var(--rail)",
        card: "var(--card)",
        border: "var(--card-border)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-soft": "var(--accent-soft)",
        good: "var(--good)",
        "good-soft": "var(--good-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        bad: "var(--bad)",
        "bad-soft": "var(--bad-soft)",
        "u-electricity": "var(--u-electricity)",
        "u-gas": "var(--u-gas)",
        "u-water": "var(--u-water)",
        "u-sewage": "var(--u-sewage)",
        "u-district-heating": "var(--u-district_heating)",
        "u-waste": "var(--u-waste)",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,26,36,0.04), 0 8px 24px rgba(23,26,36,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
