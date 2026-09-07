/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#16181C",
          800: "#1C1F24",
          700: "#24272E",
          600: "#2E323B",
          500: "#3A3F49"
        },
        stone: {
          200: "#E9E5DC",
          300: "#C9C3B6",
          400: "#9A9384"
        },
        copper: {
          400: "#D98F52",
          500: "#C97B3D",
          600: "#A9622D"
        },
        moss: {
          400: "#8FBB9F",
          500: "#6FA382"
        },
        rust: {
          400: "#C96A5C",
          500: "#B85647"
        }
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "sans-serif"],
        body: ["\"Inter\"", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "monospace"]
      }
    }
  },
  plugins: []
};
