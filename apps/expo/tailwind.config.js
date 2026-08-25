/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        "foreground-muted": "var(--color-foreground-muted)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        "accent-alt": "var(--color-accent-alt)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-card": "var(--color-surface-card)",
        "surface-card-alt": "var(--color-surface-card-alt)",
        border: "var(--color-border)",
        "border-muted": "var(--color-border-muted)",
        danger: "var(--color-danger)",
        "danger-surface": "var(--color-danger-surface)",
        "btn-primary-bg": "var(--color-btn-primary-bg)",
        "btn-primary-text": "var(--color-btn-primary-text)",
        "btn-primary-border": "var(--color-btn-primary-border)",
        "btn-secondary-bg": "var(--color-btn-secondary-bg)",
        "btn-secondary-text": "var(--color-btn-secondary-text)",
        "btn-secondary-border": "var(--color-btn-secondary-border)",
        "text-on-card": "var(--color-text-on-card)",
      },
      borderRadius: {
        panel: "var(--radius-panel)",
        btn: "var(--radius-btn)",
        card: "var(--radius-card)",
      },
      borderWidth: {
        theme: "var(--border-weight)",
      },
    },
  },
  plugins: [],
};
