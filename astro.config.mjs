import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable SSR
  adapter: cloudflare(),
  integrations: [react({
    include: ['**/*.{jsx,tsx}']
  })],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['react', 'react-dom']
    }
  },
});
