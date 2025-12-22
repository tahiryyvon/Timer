import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/options';

export default async function LocaleHome() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    // User is authenticated, redirect to dashboard
    redirect('/dashboard');
  } else {
    // User is not authenticated, redirect to sign-in
    redirect('/auth/signin');
  }
}