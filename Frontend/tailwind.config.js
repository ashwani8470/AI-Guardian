/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1720",
        surface: "#182333",
        surfaceRaised: "#1F2C3F",
        hairline: "#2A3A4D",
        textPrimary: "#E8EDF2",
        textSecondary: "#8C9BAE",
        brand: "#3DDC97",
        safe: "#3DDC97",
        suspicious: "#F5A623",
        dangerous: "#FF5A5F",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
