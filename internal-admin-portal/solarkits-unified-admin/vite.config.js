import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Rewrite named `lucide-react` barrel imports to direct per-icon ESM files during build
 * so Rollup does not parse 1,700+ unused icon modules into memory.
 */
function optimizeLucideImports() {
  const iconMap = new Map()
  try {
    const barrelPath = path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/lucide-react.mjs')
    const src = fs.readFileSync(barrelPath, 'utf8')
    for (const line of src.split('\n')) {
      const m = line.trim().match(/^export\s+\{([^}]+)\}\s+from\s+['"](\.\/icons\/[^'"]+)['"];?$/)
      if (!m) continue
      const iconRelPath = `lucide-react/dist/esm/${m[2].slice(2)}`
      for (const part of m[1].split(',')) {
        const asMatch = part.trim().match(/^default\s+as\s+([A-Za-z0-9_$]+)$/)
        if (asMatch) iconMap.set(asMatch[1], iconRelPath)
      }
    }
  } catch {
    // Fall back silently if package layout differs
  }

  return {
    name: 'optimize-lucide-imports',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (iconMap.size === 0 || id.includes('node_modules') || !code.includes('lucide-react')) return null
      if (!/\.(jsx?|tsx?)$/.test(id)) return null

      let changed = false
      const next = code.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?/g,
        (full, specList) => {
          const direct = []
          const fallback = []
          for (const raw of specList.split(',')) {
            const spec = raw.trim()
            if (!spec) continue
            const m = spec.match(/^([A-Za-z0-9_$]+)(?:\s+as\s+([A-Za-z0-9_$]+))?$/)
            if (!m) {
              fallback.push(spec)
              continue
            }
            const orig = m[1]
            const local = m[2] || orig
            const target = iconMap.get(orig)
            if (target) {
              direct.push(`import ${local} from '${target}';`)
            } else {
              fallback.push(spec)
            }
          }
          if (direct.length === 0) return full
          changed = true
          if (fallback.length > 0) {
            direct.push(`import { ${fallback.join(', ')} } from 'lucide-react';`)
          }
          return direct.join('\n')
        }
      )
      return changed ? { code: next, map: null } : null
    },
  }
}

/**
 * Filter monolithic `react-icons/<pack>/index.mjs` files (up to 5 MB each) down to
 * only the icon functions actually imported in `src/` during production builds.
 */
function optimizeReactIcons() {
  const usedByPack = new Map()
  const unsafePacks = new Set()

  const walkSrc = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') walkSrc(full)
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8')
        if (!content.includes('react-icons/')) continue
        for (const m of content.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]react-icons\/([a-z0-9-]+)['"]/g)) {
          const clause = m[1].trim()
          const pack = m[2]
          if (!clause.startsWith('{') || !clause.endsWith('}')) {
            unsafePacks.add(pack)
            continue
          }
          if (!usedByPack.has(pack)) usedByPack.set(pack, new Set())
          const set = usedByPack.get(pack)
          for (const raw of clause.slice(1, -1).split(',')) {
            const spec = raw.trim().replace(/^type\s+/, '')
            if (!spec) continue
            const nameMatch = spec.match(/^([A-Za-z0-9_$]+)(?:\s+as\s+[A-Za-z0-9_$]+)?$/)
            if (nameMatch) {
              set.add(nameMatch[1])
            } else {
              unsafePacks.add(pack)
            }
          }
        }
      }
    }
  }

  return {
    name: 'optimize-react-icons',
    apply: 'build',
    buildStart() {
      usedByPack.clear()
      unsafePacks.clear()
      walkSrc(path.resolve(__dirname, 'src'))
    },
    load(id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/')
      const m = cleanId.match(/\/node_modules\/react-icons\/([a-z0-9-]+)\/index\.mjs$/)
      if (!m) return null
      const pack = m[1]
      if (pack === 'lib' || unsafePacks.has(pack)) return null

      const wanted = usedByPack.get(pack)
      if (!wanted || wanted.size === 0) return null

      const src = fs.readFileSync(cleanId, 'utf8')
      const lines = src.split('\n')
      const out = []
      const found = new Set()
      let inWanted = false

      for (const line of lines) {
        if (!inWanted) {
          if (line.startsWith('import ') || line.startsWith('//')) {
            out.push(line)
            continue
          }
          const fnMatch = line.match(/^export function ([A-Za-z0-9_$]+)\s*\(/)
          if (fnMatch && wanted.has(fnMatch[1])) {
            found.add(fnMatch[1])
            out.push(line)
            if (!line.trimEnd().endsWith('};')) inWanted = true
          }
        } else {
          out.push(line)
          if (line.trimEnd() === '};' || line.trimEnd() === '}') {
            inWanted = false
          }
        }
      }

      if (found.size !== wanted.size) return null
      return out.join('\n')
    },
  }
}

export default defineConfig({
  plugins: [
    optimizeLucideImports(),
    optimizeReactIcons(),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/')
          if (!norm.includes('/node_modules/')) return undefined
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|react-redux|@reduxjs\/toolkit|scheduler)\//.test(norm)) {
            return 'vendor-react'
          }
          if (/\/node_modules\/(recharts|d3-|topojson-client|victory-vendor|es-toolkit)\//.test(norm)) {
            return 'vendor-charts'
          }
          if (/\/node_modules\/(xlsx|read-excel-file)\//.test(norm)) {
            return 'vendor-excel'
          }
          if (/\/node_modules\/(framer-motion|motion-dom|motion-utils|@headlessui\/react)\//.test(norm)) {
            return 'vendor-ui'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@\/(.*)/,
        replacement: '$1',
        customResolver(source, importer) {
          if (!importer) return path.resolve(__dirname, 'src', source).replace(/\\/g, '/');

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
              return candidate.replace(/\\/g, '/');
            }
          }
          return basePath.replace(/\\/g, '/');
        }
      }
    ]
  },
})
