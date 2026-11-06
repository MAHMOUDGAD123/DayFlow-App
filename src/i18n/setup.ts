/* eslint-disable import/no-named-as-default-member */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import ar from './locales/ar.json';
import en from './locales/en.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Dayflow fully controls directional layout in JS via ThemeContext (dirRow, textAlign,
// writingDirection) and custom components. Enforce native Yoga in LTR coordinates so that
// native Expo Go SharedPreferences never causes double-flipping or inverted starts.
if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

const deviceLocales = getLocales();
const primaryLanguage = deviceLocales[0]?.languageCode || 'en';
const initialLang = primaryLanguage === 'ar' ? 'ar' : 'en';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export async function setAppLanguage(lang: 'en' | 'ar') {
  await i18n.changeLanguage(lang);
  try {
    const { setSetting } = await import('@/db/repositories/settingsRepo');
    await setSetting('app_language', lang);
  } catch (err) {
    console.warn('Failed to persist app language:', err);
  }
}

export async function loadSavedAppLanguage(): Promise<'en' | 'ar'> {
  try {
    const { getSetting } = await import('@/db/repositories/settingsRepo');
    const saved = await getSetting<'en' | 'ar' | null>('app_language', null);
    if (saved === 'en' || saved === 'ar') {
      if (i18n.language !== saved) {
        await i18n.changeLanguage(saved);
      }
      return saved;
    }
  } catch {
    // fallback
  }
  return (i18n.language as 'en' | 'ar') || 'en';
}

export default i18n;

