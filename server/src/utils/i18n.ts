import path from 'path';
import fs from 'fs';

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const locales: { [key: string]: Translations } = {};

/**
 * Load localization files from the client directory
 */
function loadLocales() {
  // Path for production (locales copied to dist/locales)
  const prodLocalesDir = path.join(__dirname, '..', 'locales');
  
  // Path for development (accessing client source directly)
  // This needs to go up from server/src/utils to the root, then down
  const devLocalesDir = path.join(__dirname, '..', '..', '..', 'client', 'src', 'i18n', 'locales');

  const localesDir = fs.existsSync(prodLocalesDir) ? prodLocalesDir : devLocalesDir;
  
  if (!fs.existsSync(localesDir)) {
    console.warn(`Locales directory not found in prod or dev paths.`);
    console.warn(`Prod path tried: ${prodLocalesDir}`);
    console.warn(`Dev path tried: ${devLocalesDir}`);
    return;
  }

  const files = fs.readdirSync(localesDir);
  files.forEach(file => {
    if (file.endsWith('.json')) {
      const locale = file.replace('.json', '');
      const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
      locales[locale] = JSON.parse(content);
      console.log(`Loaded locale: ${locale}`);
    }
  });
}

// Initial load
loadLocales();

/**
 * Simple translation function for the server
 */
export function t(key: string, options: { [key: string]: any } = {}, locale: string = 'en'): string {
  const translations = locales[locale] || locales['en'];
  if (!translations) return key;

  let value: any = translations;
  const parts = key.split('.');
  
  for (const part of parts) {
    if (value && value[part] !== undefined) {
      value = value[part];
    } else {
      // Fallback to English if the key is missing in the requested locale
      if (locale !== 'en') {
        return t(key, options, 'en');
      }
      return key;
    }
  }

  if (typeof value !== 'string') return key;

  // Replace placeholders: {{name}}
  let result = value;
  Object.keys(options).forEach(optKey => {
    result = result.replace(new RegExp(`{{${optKey}}}`, 'g'), options[optKey]);
  });

  return result;
}
