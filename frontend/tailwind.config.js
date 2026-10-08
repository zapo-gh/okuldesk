/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "var(--bg)",
        foreground: "var(--text)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--color-primary-foreground)",
          dark: "var(--primary-dark)",
        },
        success: {
          DEFAULT: "var(--success)",
        },
        danger: {
          DEFAULT: "var(--danger)",
        },
        warning: {
          DEFAULT: "var(--warning)",
        },
        surface: "var(--surface)",
        muted: {
          DEFAULT: "var(--text-muted)",
        },
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          foreground: "var(--color-sidebar-foreground)",
          primary: "var(--color-sidebar-primary)",
          accent: "var(--color-sidebar-accent)",
          border: "var(--color-sidebar-border)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
