import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import TasksClient from '@/components/tasks/TasksClient';
import { ClientProviders } from '@/components/providers/ClientProviders';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tasks: {
        include: {
          timeEntries: {
            select: {
              id: true,
              totalSeconds: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <ClientProviders>
      <AppLayout user={{ name: user.name || undefined, email: user.email, role: user.role || undefined }}>
        <TasksClient user={user} />
      </AppLayout>
    </ClientProviders>
  );
}