import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.SHEET_ID': JSON.stringify(env.SHEET_ID),
      'process.env.SHEETS_API_KEY': JSON.stringify(env.SHEETS_API_KEY),
      'process.env.SHEET_RANGE': JSON.stringify(env.SHEET_RANGE),
      'process.env.SHEET_EMPLOYEE_RANGE': JSON.stringify(env.SHEET_EMPLOYEE_RANGE),
      'process.env.SHEET_LOG_RANGE': JSON.stringify(env.SHEET_LOG_RANGE),
      'process.env.SHEET_LOG_WEBHOOK': JSON.stringify(env.SHEET_LOG_WEBHOOK),
      'process.env.SHEET_LOOKUP_RANGE': JSON.stringify(env.SHEET_LOOKUP_RANGE),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
