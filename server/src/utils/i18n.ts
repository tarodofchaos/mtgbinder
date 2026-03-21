import path from 'path';
import fs from 'fs';
import { logger } from './logger';

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const locales: { [key: string]: Translations } = {};

/**
 * Load localization files from the client directory
 */
function loadLocales() {
  let localesDir: string;

  if (process.env.NODE_ENV === 'production') {
    // In production, locales are copied to `dist/locales`
    // __dirname is dist/utils
    localesDir = path.join(__dirname, '..', 'locales');
  } else {
    // In development, access client source files directly
    // __dirname is src/utils
    localesDir = path.join(__dirname, '..', '..', '..', 'client', 'src', 'i18n', 'locales');
  }

  // Fallback check: try relative to current working directory if absolute path fails
  if (!fs.existsSync(localesDir)) {
    const fallbackDir = path.join(process.cwd(), '..', 'client', 'src', 'i18n', 'locales');
    if (fs.existsSync(fallbackDir)) {
      localesDir = fallbackDir;
    }
  }

  if (!fs.existsSync(localesDir)) {
    logger.error(`Locales directory not found: ${localesDir}`);
    return;
  }

  try {
    const files = fs.readdirSync(localesDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const locale = file.replace('.json', '');
        const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
        locales[locale] = JSON.parse(content);
        logger.info(`Loaded locale: ${locale} from ${file}`);
      }
    });
  } catch (error) {
    logger.error(error, 'Failed to load locales');
  }
}

// Initial load
loadLocales();

/**
 * Simple translation function for the server
 */
export function t(key: string, options: { [key: string]: any } = {}, locale: string = 'en'): string {
  // Handle locale codes like 'en-US' by taking the base 'en'
  const baseLocale = locale.split('-')[0].toLowerCase();
  
  const translations = locales[baseLocale] || locales[locale] || locales['en'];
  
  if (!translations) {
    logger.warn(`No translations found for locale: ${locale} (fallback to en also failed)`);
    return key;
  }

  let value: any = translations;
  const parts = key.split('.');
  
  for (const part of parts) {
    if (value && typeof value === 'object' && value[part] !== undefined) {
      value = value[part];
    } else {
      // Fallback to English if the key is missing in the requested locale
      if (baseLocale !== 'en' && locale !== 'en') {
        return t(key, options, 'en');
      }
      return key;
    }
  }

  if (typeof value !== 'string') return key;

  // Replace placeholders: {{name}}
  let result = value;
  Object.keys(options).forEach(optKey => {
    // Use a more robust replacement that escapes special regex characters in the key
    const escapedKey = optKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), String(options[optKey]));
  });

  return result;
}
