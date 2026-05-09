import type { Config } from "tailwindcss";

// Tailwind v4 reads brand tokens from `@theme` in app/globals.css. This file
// is kept for any tooling that still expects a JS config; the colors here
// must mirror the CSS tokens (--color-brand-navy, etc.).
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-navy": "#1f3f66",
        "brand-navy-deep": "#0f1f36",
        "brand-orange": "#f37021",
      },
    },
  },
  plugins: [],
};
export default config;
