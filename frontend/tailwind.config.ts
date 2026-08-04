import type { Config } from "tailwindcss";

/** Bind a colour to a CSS variable holding space-separated RGB channels
 *  (e.g. `--brand-500: 255 106 0`) while keeping Tailwind's opacity
 *  modifiers (`bg-brand-500/20`) working. */
const rgbVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
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
        // ── Dyzah palette ────────────────────────────────────────────
        // `brand`, `squid`, `navy` and `link` resolve through CSS variables
        // (see globals.css) so a surface can re-theme every shared component
        // by setting one class. Defaults = Dyzah Store/Errands orange;
        // `.theme-hygiene` swaps in the Dyzah Hygiene navy + green.
        squid: rgbVar("--squid"), // dark panels / hero gradient start
        navy: rgbVar("--navy"), // secondary dark
        canvas: "#f5f5f5", // app background (light grey)
        line: "#e8e8e8", // borders / dividers
        muted: "#767676", // secondary text
        ink: "#1a1a1a", // near-black text
        link: { DEFAULT: rgbVar("--link"), hover: rgbVar("--link-hover") },
        // Primary brand ramp — themable per surface.
        brand: {
          50: rgbVar("--brand-50"),
          100: rgbVar("--brand-100"),
          200: rgbVar("--brand-200"),
          300: rgbVar("--brand-300"),
          400: rgbVar("--brand-400"),
          500: rgbVar("--brand-500"),
          600: rgbVar("--brand-600"),
          700: rgbVar("--brand-700"),
          800: rgbVar("--brand-800"),
          900: rgbVar("--brand-900"),
        },
        // ── Dyzah Hygiene brand constants ────────────────────────────
        // Taken from the company logo: navy wordmark + green "HYGIENE".
        // Fixed (not themable) so hygiene chrome keeps its identity even
        // when rendered outside the hygiene surface (e.g. the /home hub).
        hygiene: {
          navy: "#032657",
          "navy-600": "#06305f",
          "navy-400": "#0a3f80",
          green: "#59A740",
          "green-600": "#4a8f35",
          "green-100": "#ddeed5",
          "green-50": "#f1f8ee",
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
        focus: "0 0 0 3px rgb(var(--brand-500) / 0.30)",
      },
    },
  },
  plugins: [],
};

export default config;
