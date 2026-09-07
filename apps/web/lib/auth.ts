import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { eq } from "drizzle-orm";
import { db, pets, users } from "@/db";

declare module "next-auth" {
  interface Session {
    userId: string;
    username: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // GitHub now sends an `iss` param on the callback (RFC 9207); without an
  // explicit issuer Auth.js compares it to a placeholder and rejects sign-in.
  providers: [GitHub({ issuer: "https://github.com/login/oauth" })],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.id != null) {
        const githubId = Number(profile.id);
        const username = String(profile.login ?? "");
        const avatarUrl = typeof profile.avatar_url === "string" ? profile.avatar_url : null;
        const existing = await db.select().from(users).where(eq(users.githubId, githubId));
        let user = existing[0];
        if (user) {
          if (user.username !== username || user.avatarUrl !== avatarUrl) {
            await db
              .update(users)
              .set({ username, avatarUrl })
              .where(eq(users.id, user.id));
          }
        } else {
          user = { id: crypto.randomUUID(), githubId, username, avatarUrl, createdAt: new Date() };
          await db.insert(users).values(user);
          await db.insert(pets).values({ id: crypto.randomUUID(), userId: user.id });
        }
        token.uid = user.id;
        token.username = username;
      }
      return token;
    },
    session({ session, token }) {
      session.userId = token.uid as string;
      session.username = token.username as string;
      return session;
    },
  },
});
