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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailError(t('emailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(t('emailInvalid'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError(t('passwordRequired'));
      return false;
    }
    if (password.length < 6) {
      setPasswordError(t('passwordMinChars'));
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleCreateAccountClick = () => {
    setIsLoading(true);
    router.push('/auth/register');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return; // Stop if validation fails
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setGeneralError(t('credentialsInvalid'));
      } else if (result?.ok) {
        setIsLoading(true);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setGeneralError(t('signInError'));
    } finally {
      setIsSubmitting(false);
    }
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder={t('enterEmail')}
              required
              className={`w-full px-4 py-3 bg-white/20 border rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 ${
                emailError ? 'border-red-400' : 'border-white/30'
              }`}
            />
          </div>
          
          {/* Email Error */}
          {emailError && (
            <div className="text-red-300 text-sm mt-1">
              {emailError}
            </div>
          )}
          
          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="password">
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('enterPassword')}
                required
                className={`w-full px-4 py-3 pr-12 bg-white/20 border rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 ${
                  passwordError ? 'border-red-400' : 'border-white/30'
                }`}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-800 hover:text-gray-900 transition-colors duration-200 focus:outline-none focus:text-black"
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
          
          {/* Password Error */}
          {passwordError && (
            <div className="text-red-300 text-sm mt-1">
              {passwordError}
            </div>
          )}
          
          {/* General Error Message */}
          {generalError && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-center">
              <p className="text-red-200 text-sm font-medium">{generalError}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
            >
              {isSubmitting ? t('signingIn') : t('signIn')}
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