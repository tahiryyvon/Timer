'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import translation files
import enMessages from '../../../messages/en.json';
import frMessages from '../../../messages/fr.json';
import deMessages from '../../../messages/de.json';

type Messages = typeof enMessages;
type Locale = 'en' | 'fr' | 'de';

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  messages: Messages;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const messageMap: Record<Locale, Messages> = {
  en: enMessages,
  fr: frMessages,
  de: deMessages,
};

// Simple hydration-safe approach: start with English, allow switching after mount
export function TranslationProvider({ children }: { children: ReactNode }) {
  // Always start with English to prevent hydration mismatch
  const [locale, setLocale] = useState<Locale>('en');
  const [messages, setMessages] = useState<Messages>(enMessages);

  // Initialize client preferences after first render
  useEffect(() => {
    // Check for stored preference only after client-side hydration
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred-language') as Locale;
      const browserLang = navigator.language.split('-')[0] as Locale;
      const preferredLocale = stored || (messageMap[browserLang] ? browserLang : 'en');
      
      // Use a microtask to avoid cascading render warning
      if (preferredLocale !== 'en') {
        Promise.resolve().then(() => {
          setLocale(preferredLocale);
          setMessages(messageMap[preferredLocale]);
        });
      }
    }
  }, []); // Empty dependency array means this runs once after mount

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(messageMap[newLocale]);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', newLocale);
    }
  };

  // Translation function with dot notation support
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: unknown = messages;
    
    for (const k of keys) {
      result = (result as Record<string, unknown>)?.[k];
      if (result === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return typeof result === 'string' ? result : key;
  };

  return (
    <TranslationContext.Provider value={{ locale, setLocale: handleSetLocale, t, messages }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslations(namespace?: string) {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }

  const { t } = context;

  // Return a function that prefixes the namespace if provided
  return (key: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey);
  };
}

export function useLocale() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useLocale must be used within a TranslationProvider');
  }
  return context.locale;
}

export function useSetLocale() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useSetLocale must be used within a TranslationProvider');
  }
  return context.setLocale;
}