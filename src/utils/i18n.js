import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from '../locales/en.json';
import ar from '../locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  const direction = lng?.startsWith('ar') ? 'rtl' : 'ltr';
  document.documentElement.lang = lng || 'en';
  document.documentElement.dir = direction;
});

const initialDirection = i18n.language?.startsWith('ar') ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language || 'en';
document.documentElement.dir = initialDirection;

export default i18n;
