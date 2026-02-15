const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../../client/src/i18n/locales');
const destDir = path.resolve(__dirname, '../dist/locales');

try {
  if (fs.existsSync(sourceDir)) {
    fs.copySync(sourceDir, destDir, { overwrite: true });
    console.log('Successfully copied locales for production build.');
  } else {
    console.warn('Source locales directory not found, skipping copy.');
    console.warn(`Looked for: ${sourceDir}`);
  }
} catch (err) {
  console.error('Error copying locales:', err);
  process.exit(1);
}
