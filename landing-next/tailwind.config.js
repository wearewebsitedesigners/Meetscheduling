/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        page: "#f7faff",
        ink: "#0f172a",
        muted: "#5f6f8f",
        line: "#d8e2f3",
        brand: "#2159d2",
        brandDark: "#0f2d73",
        brandSoft: "#e9f0ff",
        accent: "#23b4ff",
        accentSoft: "#e9f8ff",
      },
      boxShadow: {
        soft: "0 20px 50px rgba(33, 89, 210, 0.14)",
        card: "0 12px 26px rgba(15, 23, 42, 0.10)",
        glow: "0 0 0 1px rgba(35,180,255,0.15), 0 20px 40px rgba(35,180,255,0.28)",
      },
      maxWidth: {
        container: "1200px",
      },
      borderRadius: {
        xl2: "1.75rem",
      },
      backgroundImage: {
        "grid-soft":
          "linear-gradient(to right, rgba(33,89,210,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(33,89,210,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
