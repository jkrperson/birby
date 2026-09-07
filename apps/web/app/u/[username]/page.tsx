import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatTokens } from "@birby/core";
import { petForUsername } from "@/lib/pet-service";
import PetCanvas from "@/components/PetCanvas";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}'s birby`,
    description: `A pixel pet fed by vibe coding. See how many tokens it has eaten.`,
    openGraph: {
      images: [`/api/og/${username}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/api/og/${username}`],
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const result = await petForUsername(username);
  if (!result) notFound();
  const { pet } = result;

  return (
    <main>
      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="pixel" style={{ margin: "4px 0" }}>
          {pet.name}
        </h2>
        <div style={{ color: "var(--ink-soft)" }}>
          @{username} · {pet.stage} · {pet.mood}
        </div>
        <PetCanvas stage={pet.stage} drowsy={pet.mood === "sleepy"} height={210} scale={6} />
        <div className="stats" style={{ marginTop: 12 }}>
          <div className="stat">
            <div className="label">lifetime tokens</div>
            <div className="value">{formatTokens(pet.lifetimeTokens)}</div>
          </div>
          <div className="stat">
            <div className="label">streak</div>
            <div className="value">🔥 {pet.streak}d</div>
          </div>
          <div className="stat">
            <div className="label">fullness</div>
            <div className="value">{pet.fullness}%</div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: "center", marginTop: 24 }}>
        <a className="btn" href="/">
          HATCH YOUR OWN BIRBY
        </a>
      </p>
    </main>
  );
}
