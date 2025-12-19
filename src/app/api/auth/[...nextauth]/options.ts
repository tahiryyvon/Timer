import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user || !user.password) {
          return null;
        }

        // Helper function to verify password (handles both plain text and hashed)
        async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
          // First try plain text comparison (for existing passwords)
          if (inputPassword === storedPassword) {
            return true;
          }
          
          // If bcrypt is available and password looks hashed, try bcrypt
          try {
            const bcrypt = await import('bcryptjs');
            // Check if password looks like a bcrypt hash (starts with $2a$, $2b$, or $2y$)
            if (storedPassword.match(/^\$2[ayb]\$.{56}$/)) {
              return await bcrypt.compare(inputPassword, storedPassword);
            }
          } catch {
            // bcrypt not available or comparison failed
          }
          
          return false;
        }

        // Check if password matches (handles both plain text and hashed passwords)
        const isPasswordValid = await verifyPassword(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  }
};