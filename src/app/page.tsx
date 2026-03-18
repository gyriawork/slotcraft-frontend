import { redirect } from "next/navigation";
import Link from "next/link";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasClerk = clerkKey && !clerkKey.includes("REPLACE_ME");

export default async function HomePage() {
  if (hasClerk) {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-gray-900">SlotCraft</span>
          <div className="flex items-center gap-4">
            <Link
              href={hasClerk ? "/sign-in" : "/dashboard"}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href={hasClerk ? "/sign-up" : "/dashboard"}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-blue-600">Game Design Platform for iGaming</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-gray-900">
            Design slot games with
            <br />
            <span className="text-blue-600">math-verified confidence</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            The complete toolkit for game producers. From concept to certified math model
            in one workflow. Replace spreadsheets with real-time simulation.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={hasClerk ? "/sign-up" : "/dashboard"}
              className="rounded-md bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href={hasClerk ? "/sign-in" : "/games/new"}
              className="rounded-md border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Try the Wizard
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">The complete toolkit for iGaming game design teams.</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">8-step guided workflow</h2>
            <p className="mt-3 text-gray-600">
              From initial concept to production-ready Game Design Document
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1-2", title: "Configure", desc: "Game type, grid, RTP targets, volatility, and market compliance", icon: "&#9881;" },
              { step: "3-4", title: "Design", desc: "Feature mechanics, AI-assisted creative direction, theme, and symbols", icon: "&#9998;" },
              { step: "5-6", title: "Verify", desc: "Math model with draggable RTP budget, Monte Carlo simulation via WASM", icon: "&#9878;" },
              { step: "7-8", title: "Deliver", desc: "Playable HTML5 prototype and auto-generated GDD in 6 export formats", icon: "&#128196;" },
            ].map((item) => (
              <div key={item.step} className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" dangerouslySetInnerHTML={{ __html: item.icon }} />
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Steps {item.step}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core differentiators */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Rust Simulation Engine</h3>
              <p className="mt-2 text-sm text-gray-600">
                Run 500K+ spins in your browser via WebAssembly. Full Monte Carlo verification
                with real-time convergence tracking. Same engine runs native for server-side 100M+ spin verification.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Math-First Design</h3>
              <p className="mt-2 text-sm text-gray-600">
                Integer arithmetic for RTP budgets eliminates floating-point drift.
                Draggable budget bar, editable paytables, heatmap reel strips. Multi-RTP variant support
                for different market requirements.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">5 GDD Audiences</h3>
              <p className="mt-2 text-sm text-gray-600">
                Auto-generate Game Design Documents tailored for PM, certification labs (GLI/BMM),
                art directors, developers, and executives. Export to PDF, Notion, Jira, Confluence, Markdown, or JSON.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Ready to design your next game?</h2>
          <p className="mt-3 text-gray-600">
            From initial concept to production-ready GDD — all in one workflow.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={hasClerk ? "/sign-up" : "/dashboard"}
              className="rounded-md bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="mailto:hello@slotcraft.xyz"
              className="rounded-md border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-400">
          SlotCraft &mdash; The complete platform for iGaming game design
        </div>
      </footer>
    </div>
  );
}
