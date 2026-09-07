import { sql } from "drizzle-orm";
import { formatTokens } from "@birby/core";
import { db, pets } from "@/db";
import { auth, signIn } from "@/lib/auth";
import PetCanvas from "@/components/PetCanvas";

export const dynamic = "force-dynamic";

const INSTALL = `/plugin marketplace add jkrperson/birby
/plugin install birby@birby
/birby:link`;

async function globalTokens(): Promise<number> {
  try {
    const rows = await db
      .select({ total: sql<string>`coalesce(sum(${pets.lifetimeTokens}), 0)` })
      .from(pets);
    return Number(rows[0]?.total ?? 0);
  } catch {
    return 0;
  }
}

export default async function Home() {
  const [session, total] = await Promise.all([auth(), globalTokens()]);

  return (
    <main>
      <section style={{ textAlign: "center", marginTop: 30 }}>
        <h1 className="pixel">
          Your coding agent burns tokens.
          <br />
          <span style={{ color: "var(--gold)" }}>Birby eats them.</span>
        </h1>
        <p style={{ color: "var(--ink-soft)", maxWidth: 560, margin: "16px auto" }}>
          Connect your coding agent and every session feeds a pixel pet that
          grows, evolves, and keeps your streak. A tamagotchi for vibe coders.
        </p>
        <PetCanvas stage="chick" scale={7} height={220} />
        {total > 0 && (
          <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
            {formatTokens(total)} tokens eaten by birbys so far
          </p>
        )}
        <div style={{ marginTop: 24, maxWidth: 520, margin: "24px auto 0", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
            hatch yours — paste into Claude Code:
          </div>
          <pre className="cmd" style={{ margin: 0 }}>{INSTALL}</pre>
        </div>
        <div style={{ marginTop: 20 }}>
          {session ? (
            <a className="btn" href="/pet">
              VISIT YOUR PET
            </a>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/pet" });
              }}
            >
              <button className="btn secondary" type="submit">
                ALREADY HATCHED? SIGN IN
              </button>
            </form>
          )}
        </div>
      </section>

      <section style={{ marginTop: 70 }} className="stats">
        <div className="stat">
          <div className="label">1 · install</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Three lines in Claude Code. <code>/birby:link</code> opens your
            browser — one click on Approve and the egg is yours.
          </div>
        </div>
        <div className="stat">
          <div className="label">2 · code</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Every session&apos;s tokens feed your birby automatically. Do nothing.
          </div>
        </div>
        <div className="stat">
          <div className="label">3 · grow</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Egg → hatchling → chick → birby → megabirby. Keep the streak, earn
            freezes, show it off on GitHub.
          </div>
        </div>
      </section>
    </main>
  );
}
