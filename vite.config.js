import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const pages = [
  'index.html',
  'frontpage.html',
  'about.html',
  'competitions.html',
  'contact.html',
  'login.html',
  'signup.html',
  'otp.html',
  'reset-password.html',
  'monetization.html',
  'profile.html',
  'dashboard.html',
];

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page.replaceAll('/', '-'), resolve(process.cwd(), page)]),
      ),
    },
  },
});