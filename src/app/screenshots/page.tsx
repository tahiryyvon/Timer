import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import AppLayout from '@/components/layout/AppLayout';
import { ClientProviders } from '@/components/providers/ClientProviders';
import LocalStorageScreenshots from '@/components/screenshots/LocalStorageScreenshots';
import prisma from '@/lib/prisma';

export default async function ScreenshotsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Get current user from database to check role
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // Restrict access to HR and MANAGER roles only
  if (!currentUser || (currentUser.role !== 'HR' && currentUser.role !== 'MANAGER')) {
    redirect('/dashboard');
  }

  return (
    <ClientProviders>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold theme-text-primary">Screenshots</h1>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📸 Screenshot System</h3>
            <p className="text-blue-800 text-sm">
              Screenshots are automatically captured at random intervals between 2 to 10 minutes while a timer is running.
              They are stored locally in your browser and displayed below.
            </p>
          </div>

          <LocalStorageScreenshots />
        </div>
      </AppLayout>
    </ClientProviders>
  );
}