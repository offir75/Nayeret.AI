/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        card:        { DEFAULT: 'var(--card)',        foreground: 'var(--card-foreground)'        },
        popover:     { DEFAULT: 'var(--popover)',     foreground: 'var(--popover-foreground)'     },
        primary:     { DEFAULT: 'var(--primary)',     foreground: 'var(--primary-foreground)'     },
        muted:       { DEFAULT: 'var(--muted)',       foreground: 'var(--muted-foreground)'       },
        accent:      { DEFAULT: 'var(--accent)',      foreground: 'var(--accent-foreground)'      },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        input:  'var(--input)',
        ring:   'var(--ring)',
        // Hardcoded for opacity-modifier support (bg-zen-sage/10, bg-secondary/60, etc.)
        secondary:        { DEFAULT: '#ede8e2', foreground: '#2c2825' },
        border:           '#ddd6ce',
        'zen-sage':       '#7a8c6e',
        'zen-sage-light': '#e8ede5',
        'zen-sand':       '#f5f0eb',
        'zen-stone':      '#2c2825',
        'zen-warm':       '#c4a97d',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
