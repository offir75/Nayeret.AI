/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Heebo', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        // ── shadcn tokens (hsl-var so opacity modifiers work, e.g. bg-background/50) ──
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card:        { DEFAULT: 'hsl(var(--card))',        foreground: 'hsl(var(--card-foreground))'        },
        popover:     { DEFAULT: 'hsl(var(--popover))',     foreground: 'hsl(var(--popover-foreground))'     },
        primary:     { DEFAULT: 'hsl(var(--primary))',     foreground: 'hsl(var(--primary-foreground))'     },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',   foreground: 'hsl(var(--secondary-foreground))'   },
        muted:       { DEFAULT: 'hsl(var(--muted))',       foreground: 'hsl(var(--muted-foreground))'       },
        accent:      { DEFAULT: 'hsl(var(--accent))',      foreground: 'hsl(var(--accent-foreground))'      },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',

        // ── Zen hardcoded palette — aligned with teal primary so bg-zen-sage === bg-primary ──
        'zen-sage':       '#229c76',   // ≈ hsl(168 65% 38%) — matches --primary
        'zen-sage-light': '#cbeee5',   // ≈ hsl(168 55% 87%)
        'zen-sand':       '#faf8f2',   // ≈ hsl(40 30% 97%)  — matches --background
        'zen-stone':      '#1b2333',   // ≈ hsl(220 25% 14%) — matches --foreground
        'zen-warm':       '#c4a97d',   // warm amber accent (unchanged)

        // ── Semantic status tokens ──
        warning:  { DEFAULT: 'hsl(var(--warning))',  foreground: 'hsl(var(--warning-foreground))'  },
        success:  { DEFAULT: 'hsl(var(--success))',  foreground: 'hsl(var(--success-foreground))'  },
        urgent:   { DEFAULT: 'hsl(var(--urgent))',   foreground: 'hsl(var(--urgent-foreground))'   },
        caution:  { DEFAULT: 'hsl(var(--caution))',  foreground: 'hsl(var(--caution-foreground))'  },
        notice:   { DEFAULT: 'hsl(var(--notice))',   foreground: 'hsl(var(--notice-foreground))'   },

        // ── Document category colors ──
        category: {
          identity:  'hsl(var(--cat-identity))',
          money:     'hsl(var(--cat-money))',
          bills:     'hsl(var(--cat-bills))',
          insurance: 'hsl(var(--cat-insurance))',
          trips:     'hsl(var(--cat-trips))',
        },

        // ── Sidebar tokens ──
        sidebar: {
          DEFAULT:              'hsl(var(--sidebar-background))',
          foreground:           'hsl(var(--sidebar-foreground))',
          primary:              'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent:               'hsl(var(--sidebar-accent))',
          'accent-foreground':  'hsl(var(--sidebar-accent-foreground))',
          border:               'hsl(var(--sidebar-border))',
          ring:                 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};
