import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './languages';
import { translations as staticTranslations } from './translations';

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app_language') || DEFAULT_LANGUAGE;
  });

  // Client-side cache for dynamically fetched translations from backend DeepL Translator
  const [dynamicTranslations, setDynamicTranslations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('app_i18n_cache') || '{}');
    } catch (e) {
      return {};
    }
  });

  const pendingRequestsRef = useRef(new Set());

  // Save dynamic translations to localStorage for persistent offline usage
  useEffect(() => {
    try {
      localStorage.setItem('app_i18n_cache', JSON.stringify(dynamicTranslations));
    } catch (e) {
      console.error('Failed to save i18n cache:', e);
    }
  }, [dynamicTranslations]);

  const setLanguage = useCallback((langCode) => {
    const isSupported = SUPPORTED_LANGUAGES.some(l => l.code === langCode);
    const targetLang = isSupported ? langCode : DEFAULT_LANGUAGE;
    setLanguageState(targetLang);
    localStorage.setItem('app_language', targetLang);
  }, []);

  // Server-side translation fetcher using DeepL backend endpoint (/api/translate)
  const fetchTranslationFromServer = useCallback(async (key, textToTranslate, targetLang) => {
    const reqKey = `${targetLang}:${textToTranslate}`;
    if (pendingRequestsRef.current.has(reqKey)) return;
    pendingRequestsRef.current.add(reqKey);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.translatedText) {
          setDynamicTranslations(prev => ({
            ...prev,
            [targetLang]: {
              ...(prev[targetLang] || {}),
              [key]: data.translatedText,
              [textToTranslate]: data.translatedText
            }
          }));
        }
      }
    } catch (err) {
      console.warn(`DeepL fetch failed for "${key}" in "${targetLang}":`, err);
    } finally {
      pendingRequestsRef.current.delete(reqKey);
    }
  }, []);

  // Flexible translation function: t(keyOrText, fallbackOrParams, params)
  const t = useCallback((keyOrText, fallbackOrParams, params = {}) => {
    if (!keyOrText || typeof keyOrText !== 'string') return keyOrText || '';

    let fallbackText = '';
    let actualParams = params;

    if (typeof fallbackOrParams === 'string') {
      fallbackText = fallbackOrParams;
    } else if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
      actualParams = fallbackOrParams;
      fallbackText = keyOrText;
    } else {
      fallbackText = keyOrText;
    }

    // Determine English default base text
    const defaultEngText = staticTranslations.en?.[keyOrText] || fallbackText || keyOrText;

    if (language === 'en') {
      return interpolate(defaultEngText, actualParams);
    }

    // 1. Check static preset translations by key or exact text match
    if (staticTranslations[language]?.[keyOrText]) {
      return interpolate(staticTranslations[language][keyOrText], actualParams);
    }
    if (staticTranslations[language]?.[defaultEngText]) {
      return interpolate(staticTranslations[language][defaultEngText], actualParams);
    }

    // 2. Check dynamic cache by key or exact text match
    if (dynamicTranslations[language]?.[keyOrText]) {
      return interpolate(dynamicTranslations[language][keyOrText], actualParams);
    }
    if (dynamicTranslations[language]?.[defaultEngText]) {
      return interpolate(dynamicTranslations[language][defaultEngText], actualParams);
    }

    // 3. Trigger server-side DeepL API translation in background if not already cached
    fetchTranslationFromServer(keyOrText, defaultEngText, language);

    // 4. Return English fallback text until DeepL translation arrives
    return interpolate(defaultEngText, actualParams);
  }, [language, dynamicTranslations, fetchTranslationFromServer]);

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageObj: SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0]
    }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

// Component for wrapping inline text elements: <Trans>Your text here</Trans>
export const Trans = ({ children, i18nKey, params }) => {
  const { t } = useTranslation();
  if (typeof children === 'string') {
    return t(i18nKey || children, children, params);
  }
  return children;
};

// Interpolation helper: replaces {paramName} with params[paramName]
function interpolate(text, params) {
  if (!text || typeof text !== 'string') return text || '';
  if (!params || Object.keys(params).length === 0) return text;

  return text.replace(/\{(\w+)\}/g, (match, paramName) => {
    return params[paramName] !== undefined ? params[paramName] : match;
  });
}
