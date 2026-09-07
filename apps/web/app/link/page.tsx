import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { apiTokens, db } from "@/db";
import { approveDevice, pendingDevice } from "@/lib/device";
import { hashToken, mintToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const INSTALL = `/plugin marketplace add jkrperson/birby
/plugin install birby@birby
/birby:link`;

export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; minted?: string; linked?: string; error?: string }>;
}) {
  const session = await auth();
  const { code, minted, linked, error } = await searchParams;

  // --- Device flow: the terminal sent the user here with ?code= ---
  if (code) {
    const pending = await pendingDevice(code);
    if (pending === "expired" || pending === null) {
      return (
        <main className="card" style={{ textAlign: "center" }}>
          <h2 className="pixel">Code {pending === "expired" ? "expired" : "not found"}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
            Run <code>/birby:link</code> again in Claude Code to get a fresh link.
          </p>
        </main>
      );
    }

    if (!session) {
      return (
        <main className="card" style={{ textAlign: "center" }}>
          <h2 className="pixel">Link your terminal</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
            Sign in with GitHub and your birby will hatch in Claude Code.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: `/link?code=${encodeURIComponent(code)}` });
            }}
          >
            <button className="btn" type="submit">
              SIGN IN WITH GITHUB
            </button>
          </form>
        </main>
      );
    }

    async function approve() {
      "use server";
      const s = await auth();
      if (!s) redirect("/");
      const result = await approveDevice(code!, s.userId);
      redirect(result === "ok" ? "/link?linked=1" : `/link?error=${result}`);
    }

    return (
      <main className="card" style={{ textAlign: "center" }}>
        <h2 className="pixel">Link this terminal?</h2>
        <p style={{ fontSize: 14 }}>
          {pending.hostname ? (
            <>
              <strong>{pending.hostname}</strong> wants to feed{" "}
            </>
          ) : (
            <>A terminal wants to feed </>
          )}
          <strong>@{session.username}</strong>&apos;s birby.
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
          Check the code matches your terminal: <code>{pending.userCode}</code>
        </p>
        <form action={approve}>
          <button className="btn" type="submit">
            APPROVE
          </button>
        </form>
      </main>
    );
  }

  if (linked) {
    return (
      <main className="card" style={{ textAlign: "center" }}>
        <h2 className="pixel">Linked! 🐣</h2>
        <p style={{ fontSize: 14 }}>
          Head back to your terminal — your birby is waiting. Every session from now
          on feeds it automatically.
        </p>
        {session && (
          <a className="btn secondary" href="/pet">
            VISIT YOUR PET
          </a>
        )}
      </main>
    );
  }

  // --- Instructions + manual token fallback ---
  if (!session) redirect("/");

  async function mint() {
    "use server";
    const s = await auth();
    if (!s) redirect("/");
    const token = mintToken();
    await db.insert(apiTokens).values({
      id: crypto.randomUUID(),
      userId: s.userId,
      tokenHash: hashToken(token),
      label: "manual",
    });
    redirect(`/link?minted=${encodeURIComponent(token)}`);
  }

  return (
    <main>
      <h2 className="pixel">Connect Claude Code</h2>
      {error && (
        <p style={{ color: "var(--gold)", fontSize: 14 }}>
          That link {error === "expired" ? "expired" : "was already used"} — run{" "}
          <code>/birby:link</code> again.
        </p>
      )}
      <p style={{ fontSize: 14 }}>Paste these into Claude Code:</p>
      <pre className="cmd">{INSTALL}</pre>
      <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
        <code>/birby:link</code> opens a page like this one; click Approve and
        you&apos;re done. Your pet eats every session&apos;s tokens from then on —
        check in with <code>/birby:pet</code>.
      </p>

      <details style={{ marginTop: 28, fontSize: 14 }}>
        <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
          Other agents, CI, or self-hosting? Use a connect token instead.
        </summary>
        <div style={{ marginTop: 12 }}>
          {minted ? (
            <>
              Shown once — treat it like a password:
              <pre className="cmd">/birby:link {minted}</pre>
              Or from anything that can make HTTP requests:{" "}
              <code>Authorization: Bearer {minted}</code> → <code>POST /api/feed</code>
            </>
          ) : (
            <form action={mint}>
              <button className="btn secondary" type="submit">
                MINT CONNECT TOKEN
              </button>
            </form>
          )}
        </div>
      </details>
    </main>
  );
}
