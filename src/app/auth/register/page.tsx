'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/components/providers/LoadingProvider';
import { useTranslations } from '@/components/providers/TranslationProvider';
import LanguageSwitcher from '@/components/language/LanguageSwitcherStandalone';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// Define role types
type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'EMPLOYEE' // Default to EMPLOYEE role
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { setIsLoading: setGlobalLoading } = useLoading();

  const handleSignInClick = () => {
    setGlobalLoading(true);
    router.push('/auth/signin');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError(t('passwordTooShort'));
      setIsLoading(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...submitData } = formData; // Remove confirmPassword from submission
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccess(t('registrationSuccess'));
        setTimeout(() => {
          router.push('/auth/signin');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || t('registrationFailed'));
      }
    } catch {
      setError(t('registrationError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex justify-center items-center p-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('createAccountTitle')}</h1>
          <p className="text-white/70">{t('joinTeam')}</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-400/50 text-green-200 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="name">
              {t('name')}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder={t('enterFullName')}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="email">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={t('enterEmail')}
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
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t('enterSecurePassword')}
                className="w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {/* Password strength indicator */}
            <div className="mt-3">
              <p className="text-xs text-white/70 mb-2">{t('passwordMinLength')}</p>
              {formData.password && (
                <div className="flex space-x-1">
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${formData.password.length >= 6 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${formData.password.length >= 8 ? 'bg-green-400' : 'bg-white/20'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${/[A-Z]/.test(formData.password) ? 'bg-green-400' : 'bg-white/20'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${/[0-9]/.test(formData.password) ? 'bg-green-400' : 'bg-white/20'}`}></div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="confirmPassword">
              {t('confirmPassword')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder={t('retypePassword')}
                className={`w-full px-4 py-3 pr-12 bg-white/20 border rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 transition-all duration-200 ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-400 focus:ring-red-400'
                    : formData.confirmPassword && formData.password === formData.confirmPassword
                    ? 'border-green-400 focus:ring-green-400'
                    : 'border-white/30 focus:ring-purple-400 focus:border-transparent'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-red-400 mt-2 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {t('passwordsDoNotMatch')}
              </p>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="text-xs text-green-400 mt-2 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t('passwordsMatch')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2" htmlFor="role">
              {t('role')}
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
            >
              <option value="EMPLOYEE" className="bg-slate-800 text-white">👨‍💼 {t('employee')} - {t('employeeDesc')}</option>
              <option value="MANAGER" className="bg-slate-800 text-white">👔 {t('manager')} - {t('managerDesc')}</option>
              <option value="HR" className="bg-slate-800 text-white">🏢 {t('hr')} - {t('hrDesc')}</option>
            </select>
            <p className="text-xs text-white/70 mt-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20">
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {t('roleHelp')}
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading || (formData.password !== formData.confirmPassword && formData.confirmPassword !== '') || formData.password.length < 6}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('creatingAccount')}
                </span>
              ) : (
                t('createAccount')
              )}
            </button>
            
            <div className="text-center">
              <span className="text-white/70 text-sm">{t('alreadyHaveAccount')} </span>
              <button
                type="button"
                onClick={handleSignInClick}
                className="text-purple-400 hover:text-purple-300 font-semibold text-sm transition-colors duration-200"
              >
                {t('signIn')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}