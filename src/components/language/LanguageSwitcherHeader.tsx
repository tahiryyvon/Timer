'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLocale, useSetLocale } from '../providers/TranslationProvider';

type Language = {
  code: 'en' | 'fr' | 'de';
  name: string;
  flag: string;
};

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

interface LanguageSwitcherProps {
  variant?: 'header' | 'sidebar';
}

export default function LanguageSwitcher({ variant = 'sidebar' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const setLocale = useSetLocale();
  const [hasMounted, setHasMounted] = useState(false);

  // Lazy initialization on interaction to avoid hydration issues
  const handleFirstInteraction = () => {
    if (!hasMounted) {
      setHasMounted(true);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const handleLanguageChange = (langCode: 'en' | 'fr' | 'de') => {
    setLocale(langCode);
    setIsOpen(false);
  };

  const handleToggle = () => {
    handleFirstInteraction();
    setIsOpen(!isOpen);
  };

  const isHeader = variant === 'header';

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
          isHeader
            ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700'
            : 'bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white'
        }`}
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className={`hidden sm:block text-sm font-medium ${isHeader ? 'text-gray-700' : 'text-white'}`}>
          {currentLanguage.name}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${isHeader ? 'text-gray-500' : 'text-white'}`} 
        />
      </button>

      {isOpen && hasMounted && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-purple-50 transition-colors duration-200 ${
                  language.code === locale 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
                {language.code === locale && (
                  <div className="ml-auto w-2 h-2 bg-purple-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}