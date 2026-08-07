/** @type {import('tailwindcss').Config} */
export default {
  content: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    './index.html',
    './src/**/*.{js,ts,tsx,jsx}',
  ],
  theme: {
    extend: {
      flexGrow: {
        2: '2',
      },
      colors: {
        'flow-handle': 'hsl(var(--flow-handle))',
      },
    },
    screens: {
      sm: '640px',
      // => @media (min-width: 640px) { ... }

      md: '768px',
      // => @media (min-width: 768px) { ... }

      lg: '1024px',
      // => @media (min-width: 1024px) { ... }

      xl: '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }

      '3xl': '1792px',
      // => @media (min-width: 1792px) { ... }
    },
  },
  plugins: [],
};
