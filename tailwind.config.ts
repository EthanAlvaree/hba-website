import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'hba-navy': '#173a63',
        'hba-blue': '#1f3f66',
        'hba-orange': '#f37021', // Sampled from CH-CH accents
      },
    },
  },
  plugins: [],
};
export default config;