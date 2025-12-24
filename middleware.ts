import createMiddleware from 'next-intl/middleware';
import {locales} from './src/i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,
  
  // Used when no locale matches
  defaultLocale: 'en',
  
  // Always use locale prefix
  localePrefix: 'always'
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};