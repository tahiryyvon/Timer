import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import TimeEntriesClient from '@/components/time-entries/TimeEntriesClient';
import { ClientProviders } from '@/components/providers/ClientProviders';

export default async function TimeEntriesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      timeEntries: {
        include: {
          task: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
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
        <TimeEntriesClient user={user} />
      </AppLayout>
    </ClientProviders>
  );
}