import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'og-image.svg');
const pngPath = path.join(__dirname, 'public', 'og-image.png');

// Read SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert to PNG
sharp(svgBuffer)
  .resize(1200, 630)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✅ Successfully created og-image.png');
    console.log(`📁 Saved to: ${pngPath}`);
  })
  .catch(err => {
    console.error('❌ Error converting SVG to PNG:', err);
    process.exit(1);
  });
