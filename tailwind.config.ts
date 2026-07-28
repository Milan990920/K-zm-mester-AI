import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F3F5F1",
        grid: "#B9C2B4",
        card: "#FFFFFF",
        border: "#E4E8E1",
        ink: "#1E2422",
        muted: "#5C6B63",
        brass: "#B8863B",
        danger: "#C1443B",
        energy: {
          electricity: "#2F6FA3",
          gas: "#C97A2E",
          district_heating: "#B8402F",
          water: "#2E8F92",
          sewage: "#5C6B63",
          fuel: "#6B4F8A",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
