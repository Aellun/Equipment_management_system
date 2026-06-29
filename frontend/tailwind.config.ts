import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // ── Dyzah unified Alibaba.com-style palette ──────────────────
        // Shared across Store, Services and Admin surfaces.
        // Alibaba: vivid orange CTAs, white/light chrome, grey canvas.
        squid: "#1d1d1f", // dark panels / hero gradient end
        navy: "#2b2b2f", // secondary dark
        canvas: "#f5f5f5", // app background (light grey)
        line: "#e8e8e8", // borders / dividers
        muted: "#767676", // secondary text
        ink: "#1a1a1a", // near-black text
        link: { DEFAULT: "#ff6a00", hover: "#e85f00" },
        // Brand: Alibaba orange
        brand: {
          50: "#fff3ec",
          100: "#ffe0cc",
          200: "#ffc09a",
          300: "#ff9d63",
          400: "#ff8336",
          500: "#ff6a00", // Alibaba primary orange
          600: "#e85f00",
          700: "#c44f00",
          800: "#9c3f00",
          900: "#7a3200",
        },
        // Secondary warm accent (deal/highlight)
        accent: {
          400: "#ffb84d",
          500: "#ff8800",
          600: "#f57b00",
          700: "#d96a00",
        },
        gold: {
          50: "#fff8e6",
          100: "#fff0c2",
          300: "#ffd75e",
          500: "#fbb034",
          600: "#e08e1a",
          700: "#b56f12",
        },
        leaf: {
          100: "#dcfce7",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
        },
        sky: {
          100: "#fff0e6",
          500: "#ff6a00",
          600: "#e85f00",
          700: "#c44f00",
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        slideInUp: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        slideToast: {
          from: { opacity: "0", transform: "translateX(120%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        slideIn: "slideIn 0.25s ease-out",
        slideInUp: "slideInUp 0.25s ease-out",
        slideToast: "slideToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.08)",
        focus: "0 0 0 3px rgba(255,106,0,0.30)",
      },
    },
  },
  plugins: [],
};

export default config;
