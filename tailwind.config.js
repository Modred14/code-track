/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Modred brand: near-black background, subtle blue accent.
        ink: {
          950: "#08090b",
          900: "#0d0f12",
          800: "#151820",
          700: "#1e222c",
          600: "#2a2f3b",
        },
        accent: {
          DEFAULT: "#4d8dff",
          dim: "#2f4f8f",
          glow: "#4d8dff33",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
