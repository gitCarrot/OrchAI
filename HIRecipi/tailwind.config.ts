import type { Config } from "tailwindcss"

const config = {
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
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
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
      },
      typography: ({ theme }: any) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.foreground'),
            '--tw-prose-headings': theme('colors.foreground'),
            '--tw-prose-lead': theme('colors.muted.foreground'),
            '--tw-prose-links': theme('colors.primary.DEFAULT'),
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': theme('colors.foreground'),
            '--tw-prose-bullets': theme('colors.foreground'),
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.foreground'),
            '--tw-prose-quote-borders': theme('colors.border'),
            '--tw-prose-captions': theme('colors.muted.foreground'),
            '--tw-prose-code': theme('colors.foreground'),
            '--tw-prose-pre-code': theme('colors.muted.foreground'),
            '--tw-prose-pre-bg': theme('colors.muted.DEFAULT'),
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),

            // Dark mode
            '--tw-prose-invert-body': theme('colors.foreground'),
            '--tw-prose-invert-headings': theme('colors.foreground'),
            '--tw-prose-invert-lead': theme('colors.muted.foreground'),
            '--tw-prose-invert-links': theme('colors.primary.DEFAULT'),
            '--tw-prose-invert-bold': theme('colors.foreground'),
            '--tw-prose-invert-counters': theme('colors.foreground'),
            '--tw-prose-invert-bullets': theme('colors.foreground'),
            '--tw-prose-invert-hr': theme('colors.border'),
            '--tw-prose-invert-quotes': theme('colors.foreground'),
            '--tw-prose-invert-quote-borders': theme('colors.border'),
            '--tw-prose-invert-captions': theme('colors.muted.foreground'),
            '--tw-prose-invert-code': theme('colors.foreground'),
            '--tw-prose-invert-pre-code': theme('colors.muted.foreground'),
            '--tw-prose-invert-pre-bg': theme('colors.muted.DEFAULT'),
            '--tw-prose-invert-th-borders': theme('colors.border'),
            '--tw-prose-invert-td-borders': theme('colors.border'),

            maxWidth: 'none',
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            'blockquote p:first-of-type::before': { content: '""' },
            'blockquote p:last-of-type::after': { content: '""' },
            img: {
              borderRadius: theme('borderRadius.lg'),
            },
            h1: {
              fontSize: '2rem',
              marginTop: '2rem',
              marginBottom: '1rem',
              fontWeight: '700',
            },
            h2: {
              fontSize: '1.5rem',
              marginTop: '1.75rem',
              marginBottom: '0.75rem',
              fontWeight: '600',
            },
            h3: {
              fontSize: '1.25rem',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
              fontWeight: '600',
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.625rem',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.625rem',
            },
            'ul > li': {
              paddingLeft: '0.375rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            'ol > li': {
              paddingLeft: '0.375rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            code: {
              color: 'var(--tw-prose-code)',
              backgroundColor: 'var(--tw-prose-pre-bg)',
              borderRadius: '0.25rem',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              fontSize: '0.875em',
            },
            pre: {
              color: 'var(--tw-prose-pre-code)',
              backgroundColor: 'var(--tw-prose-pre-bg)',
              borderRadius: '0.5rem',
              padding: '1rem',
              overflowX: 'auto',
            },
            'pre code': {
              backgroundColor: 'transparent',
              borderWidth: '0',
              borderRadius: '0',
              padding: '0',
              color: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              lineHeight: 'inherit',
            },
          },
        },
      }),
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
} satisfies Config

export default config 