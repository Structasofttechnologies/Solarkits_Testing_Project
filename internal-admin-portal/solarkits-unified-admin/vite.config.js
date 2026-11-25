import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
  },
  resolve: {
    alias: [
      {
        find: /^@\/(.*)/,
        replacement: '$1',
        customResolver(source, importer, options) {
          if (!importer) return path.resolve(__dirname, 'src', source);

          const cleanImporter = importer.replace(/\\/g, '/');
          const match = cleanImporter.match(/\/src\/portals\/([^/]+)\//i);

          let targetDir = path.resolve(__dirname, 'src');
          if (match) {
            targetDir = path.resolve(__dirname, 'src/portals', match[1]);
          }

          const basePath = path.resolve(targetDir, source);
          const extensions = ['', '.jsx', '.js', '.tsx', '.ts', '/index.jsx', '/index.js'];

          for (const ext of extensions) {
            const candidate = basePath + ext;
            if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
              return candidate;
            }
          }
          return basePath;
        }
      }
    ]
  },
})
