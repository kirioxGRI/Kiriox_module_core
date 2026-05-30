import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAuthRepository } from "@/core/auth/infrastructure/PrismaAuthRepository";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return "/login?error=not_registered";
      }

      const email = user.email.trim().toLowerCase();
      const repo = new PrismaAuthRepository();
      const dbUser = await repo.findUserByIdentifier(email);

      if (!dbUser) {
        return "/login?error=not_registered";
      }

      if (!dbUser.is_active) {
        return "/login?error=inactive";
      }

      return true;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/api/auth/google-login-success`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
