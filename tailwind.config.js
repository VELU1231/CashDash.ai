/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // CashBash brand palette
        emerald: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0",
          300: "#6ee7b7", 400: "#34d399", 500: "#10b981",
          600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b",
        },
        slate: {
          50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
          300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b",
          600: "#475569", 700: "#334155", 800: "#1e293b",
          900: "#0f172a", 950: "#020617",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-6px) rotate(1deg)" },
          "66%": { transform: "translateY(-3px) rotate(-1deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px -5px hsl(160 84% 39% / 0.2)" },
          "50%": { boxShadow: "0 0 30px -5px hsl(160 84% 39% / 0.35)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        grain: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-5%, -10%)" },
          "20%": { transform: "translate(-15%, 5%)" },
          "30%": { transform: "translate(7%, -25%)" },
          "40%": { transform: "translate(-5%, 25%)" },
          "50%": { transform: "translate(-15%, 10%)" },
          "60%": { transform: "translate(15%, 0%)" },
          "70%": { transform: "translate(0%, 15%)" },
          "80%": { transform: "translate(3%, 35%)" },
          "90%": { transform: "translate(-10%, 10%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scale-in 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        grain: "grain 8s steps(10) infinite",
      },
      backgroundImage: {
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 25%, hsl(var(--card) / 0.3) 50%, transparent 75%)",
        "hero-gradient":
          "linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--primary) / 0.03) 50%, transparent 80%)",
        "subtle-gradient":
          "linear-gradient(135deg, hsl(var(--muted) / 0.5) 0%, transparent 60%)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "'Times New Roman'", "serif"],
        mono: ["var(--font-mono)", "'Courier New'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px hsl(var(--primary) / 0.3)",
        "glow-warm": "0 0 20px -5px hsl(var(--primary) / 0.3)",
        "card-hover": "0 8px 30px -8px hsl(var(--foreground) / 0.12)",
        soft: "0 2px 8px -2px hsl(var(--foreground) / 0.06)",
        glass: "0 4px 24px -4px hsl(var(--foreground) / 0.06), inset 0 1px 0 hsl(var(--foreground) / 0.02)",
        editorial: "0 16px 48px -12px hsl(var(--foreground) / 0.1)",
        float: "0 8px 32px -8px hsl(var(--foreground) / 0.08)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};
