'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/components/providers/LoadingProvider';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';
import LanguageSwitcher from '@/components/language/LanguageSwitcherStandalone';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const handleCreateAccountClick = () => {
    setIsLoading(true);
    router.push('/auth/register');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex justify-center items-center p-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('welcomeBack')}</h1>
          <p className="text-white/70">{t('signInToAccount')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="email">
              {t('emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('enterEmail')}
              required
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="password">
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enterPassword')}
                required
                className="w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                title={showPassword ? tCommon('hidePassword') : tCommon('showPassword')}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 transform hover:scale-[1.02]"
            >
              {t('signIn')}
            </button>
            
            <div className="text-center">
              <span className="text-white/70 text-sm">{t('dontHaveAccount')} </span>
              <button
                type="button"
                onClick={handleCreateAccountClick}
                className="text-purple-400 hover:text-purple-300 font-semibold text-sm transition-colors duration-200"
              >
                {t('createAccount')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}