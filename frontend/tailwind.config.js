/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      colors: {
        // ── Accent: pure white / light-grey (replaces all blues) ──────────
        accent: {
          50:  "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",   // primary accent
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
        },
        // ── Surface layers: true blacks ───────────────────────────────────
        ink: {
          950: "#000000",
          900: "#0a0a0a",
          800: "#111111",
          700: "#1a1a1a",
          600: "#222222",
        },
        panel: {
          900: "#0d0d0d",
          800: "#141414",
          700: "#1c1c1c",
          600: "#242424",
          500: "#2e2e2e",
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "fade-in":    "fadeIn 0.4s ease forwards",
        "scale-in":   "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "wave-1":     "wave 1.2s ease-in-out 0.0s infinite alternate",
        "wave-2":     "wave 1.2s ease-in-out 0.2s infinite alternate",
        "wave-3":     "wave 1.2s ease-in-out 0.4s infinite alternate",
        "shimmer":    "shimmer 2.5s linear infinite",
        "bounce-dot": "bounceDot 1s ease-in-out infinite",
        "ping-slow":  "ping 2s cubic-bezier(0,0,0.2,1) infinite",
        "spin-slow":  "spin 2s linear infinite",
      },
      keyframes: {
        fadeUp:    { "0%": { opacity: 0, transform: "translateY(14px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        fadeIn:    { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        scaleIn:   { "0%": { opacity: 0, transform: "scale(0.93)" }, "100%": { opacity: 1, transform: "scale(1)" } },
        wave:      { "0%": { height: "6px" }, "100%": { height: "28px" } },
        shimmer:   { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        bounceDot: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
    },
  },
  plugins: [],
};
