import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import "./globals.css";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Birby — feed a pet by vibe coding",
  description:
    "Your coding agent burns tokens. Birby eats them. Connect Claude Code and grow a pixel pet with every session.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://birby.me"),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" className={pixel.variable}>
      <body>
        <div className="wrap">
          <header className="site">
            <Link href="/" className="logo">
              BIRBY
            </Link>
            <nav>
              {session ? (
                <>
                  <Link href="/pet">my pet</Link>
                  <Link href={`/u/${session.username}`}>profile</Link>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                    style={{ display: "inline" }}
                  >
                    <button
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        marginLeft: 18,
                        fontSize: 14,
                        color: "var(--ink-soft)",
                      }}
                    >
                      sign out
                    </button>
                  </form>
                </>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: "/pet" });
                  }}
                  style={{ display: "inline" }}
                >
                  <button
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--ink-soft)",
                    }}
                  >
                    sign in with github
                  </button>
                </form>
              )}
            </nav>
          </header>
          {children}
          <footer className="site">
            birby eats tokens so you don&apos;t have to ·{" "}
            <a href="https://github.com" rel="noopener">
              open source
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
