import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find Cesium build directory (hoisted or local)
let targetDir = path.resolve(__dirname, '../../node_modules/cesium/Build/Cesium');
if (!fs.existsSync(targetDir)) {
  targetDir = path.resolve(__dirname, '../node_modules/cesium/Build/Cesium');
}

const linkDir = path.resolve(__dirname, '../public/cesium');
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(linkDir) && fs.existsSync(targetDir)) {
  try {
    fs.symlinkSync(targetDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir');
    console.log('[setup-cesium] Linked Cesium build assets to public/cesium');
  } catch (err) {
    console.warn('[setup-cesium] Could not create symlink/junction, copying assets...', err.message);
    fs.cpSync(targetDir, linkDir, { recursive: true });
  }
}
