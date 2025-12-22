import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import UserManagementClient from '@/components/users/UserManagementClient';
import { ClientProviders } from '@/components/providers/ClientProviders';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/auth/signin');
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!currentUser) {
    return <div>User not found.</div>;
  }

  // Check if user has permission to access user management (HR or MANAGER only)
  if (currentUser.role !== 'HR' && currentUser.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  // Fetch all users for management
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: {
          tasks: true,
          timeEntries: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <ClientProviders>
      <AppLayout user={{ name: currentUser.name || undefined, email: currentUser.email, role: currentUser.role || undefined }}>
        <UserManagementClient 
          currentUser={currentUser} 
          users={users}
        />
      </AppLayout>
    </ClientProviders>
  );
}