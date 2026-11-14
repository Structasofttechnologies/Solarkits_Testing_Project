const fs = require('fs');
const path = require('path');

function search(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', '.gemini', 'build'].includes(item)) {
          search(full);
        }
      } else {
        const lower = item.toLowerCase();
        if (lower.endsWith('.json') || lower.endsWith('.geojson') || lower.endsWith('.svg')) {
          if (lower.includes('india') || lower.includes('district') || lower.includes('state') || lower.includes('geo') || lower.includes('map')) {
            console.log(full, 'Size:', stat.size);
          }
        }
      }
    } catch (e) {}
  }
}

search('.');
