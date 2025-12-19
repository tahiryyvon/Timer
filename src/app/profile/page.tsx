import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import ProfileClient from '@/components/profile/ProfileClient';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <AppLayout user={{ name: user.name || undefined, email: user.email, role: user.role || undefined }}>
      <ProfileClient user={user} />
    </AppLayout>
  );
}