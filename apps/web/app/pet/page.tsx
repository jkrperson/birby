import { redirect } from "next/navigation";
import { eq, gte, and, sql } from "drizzle-orm";
import { formatTokens } from "@birby/core";
import { db, feedings, pets } from "@/db";
import { auth } from "@/lib/auth";
import { petForUserId } from "@/lib/pet-service";
import PetCanvas from "@/components/PetCanvas";

export const dynamic = "force-dynamic";

const MOOD_FACES: Record<string, string> = {
  ecstatic: "(≧◡≦)",
  happy: "(◕‿◕)",
  content: "(・‿・)",
  hungry: "(´•̥ ω •̥`)",
  sleepy: "(-, – )…zzz",
};

async function dailyTotals(userId: string): Promise<number[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      day: sql<string>`to_char(${feedings.createdAt}, 'YYYY-MM-DD')`,
      total: sql<string>`sum(${feedings.inputTokens} + ${feedings.outputTokens} + ${feedings.cacheReadTokens} + ${feedings.cacheCreationTokens})`,
    })
    .from(feedings)
    .innerJoin(pets, eq(feedings.petId, pets.id))
    .where(and(eq(pets.userId, userId), gte(feedings.createdAt, since)))
    .groupBy(sql`1`);
  const byDay = new Map(rows.map((r) => [r.day, Number(r.total)]));
  const out: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? 0);
  }
  return out;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 14;
  return (
    <svg
      width={values.length * w}
      height={48}
      role="img"
      aria-label="tokens eaten over the last 14 days"
    >
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * 44));
        return (
          <rect
            key={i}
            x={i * w + 2}
            y={48 - h}
            width={w - 4}
            height={h}
            fill={v > 0 ? "var(--gold)" : "var(--line)"}
            opacity={v > 0 ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}

export default async function PetPage() {
  const session = await auth();
  if (!session) redirect("/");
  const pet = await petForUserId(session.userId);
  if (!pet) redirect("/");
  const days = await dailyTotals(session.userId);
  const everFed = pet.lifetimeTokens > 0;

  const profileUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://birby.me"}/u/${session.username}`;
  const tweet = `https://twitter.com/intent/tweet?${new URLSearchParams({
    text: `My birby has eaten ${formatTokens(pet.lifetimeTokens)} tokens 🐦🔥${pet.streak}`,
    url: profileUrl,
  })}`;

  return (
    <main>
      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="pixel" style={{ margin: "4px 0" }}>
          {pet.name} <span style={{ color: "var(--ink-soft)" }}>· {pet.stage}</span>
        </h2>
        <div style={{ color: "var(--ink-soft)" }}>
          {MOOD_FACES[pet.mood]} {pet.mood}
        </div>
        <PetCanvas stage={pet.stage} drowsy={pet.mood === "sleepy"} height={210} scale={6} />
        <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>fullness</div>
          <div className="meter">
            <div style={{ width: `${pet.fullness}%` }} />
          </div>
          {pet.tokensToNextStage !== null && (
            <>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
                evolution — {formatTokens(pet.tokensToNextStage)} tokens to go
              </div>
              <div className="meter">
                <div
                  style={{
                    width: `${Math.round(pet.stageProgress * 100)}%`,
                    background: "var(--teal)",
                  }}
                />
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: 18 }}>
          <a className="btn" href={tweet} target="_blank" rel="noopener">
            SHARE ON X
          </a>{" "}
          <a className="btn secondary" href={`/u/${session.username}`}>
            PUBLIC PAGE
          </a>
        </div>
      </div>

      <section className="stats" style={{ marginTop: 24 }}>
        <div className="stat">
          <div className="label">lifetime tokens</div>
          <div className="value">{formatTokens(pet.lifetimeTokens)}</div>
        </div>
        <div className="stat">
          <div className="label">streak</div>
          <div className="value">🔥 {pet.streak}d</div>
        </div>
        <div className="stat">
          <div className="label">streak freezes</div>
          <div className="value">🧊 {pet.streakFreezes}</div>
        </div>
        <div className="stat">
          <div className="label">last 14 days</div>
          <Sparkline values={days} />
        </div>
      </section>

      {!everFed && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="pixel" style={{ fontSize: 16 }}>
            Connect Claude Code to hatch your egg
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Paste into Claude Code — <code>/birby:link</code> opens a page here,
            click Approve, and every session feeds your pet from then on.
          </p>
          <pre className="cmd">
            {"/plugin marketplace add jkrperson/birby\n/plugin install birby@birby\n/birby:link"}
          </pre>
          <a className="btn secondary" href="/link">
            OTHER AGENTS / MANUAL TOKEN
          </a>
        </section>
      )}

      <section style={{ marginTop: 24, fontSize: 14, color: "var(--ink-soft)" }}>
        <p>
          GitHub README badge:{" "}
          <code>
            ![birby]({process.env.NEXT_PUBLIC_BASE_URL ?? "https://birby.me"}/api/badge/
            {session.username}.svg)
          </code>
        </p>
      </section>
    </main>
  );
}
