import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/server/db";

const credentialsSchema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(4).max(128) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [Credentials({
    credentials: { identifier: { label: "Usuario o email", type: "text" }, password: { label: "Contraseña", type: "password" } },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const identifier = parsed.data.identifier.toLowerCase();
      const email = identifier === "admin" && process.env.NODE_ENV !== "production" ? "admin@nutricion.local" : identifier;
      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  })],
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.sub = user.id; return token; },
    session({ session, token }) { if (session.user && token.sub) session.user.id = token.sub; return session; },
  },
});
