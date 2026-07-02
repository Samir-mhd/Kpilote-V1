import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-between px-6 py-10"
      style={{ background: "#0a0a0f" }}
    >

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-lg"
          style={{ background: "linear-gradient(135deg, #7c3aed, #c026d3)" }}
        >
          K
        </div>
        <span className="text-lg font-semibold tracking-widest">
          <span style={{ color: "#a78bfa" }}>KPI</span>
          <span className="text-white">LOTE</span>
        </span>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center text-center w-full max-w-lg">

        {/* Slogan */}
        <div className="flex items-center justify-center gap-4 mb-14 mt-16">
          <span className="text-3xl font-semibold" style={{ color: "#a78bfa" }}>Piloter</span>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4c1d95" }} />
          <span className="text-3xl font-semibold text-white">Optimiser</span>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4c1d95" }} />
          <span className="text-3xl font-semibold" style={{ color: "#a78bfa" }}>Performer</span>
        </div>

        {/* Cartes */}
        <div className="grid grid-cols-2 gap-4 w-full">

          {/* Manager */}
          <Link
            href="/manager/dashboard"
            className="rounded-2xl p-8 text-left relative overflow-hidden block transition-all duration-300 hover:-translate-y-2"
            style={{
              background: "linear-gradient(145deg, #1e1b4b, #2e1065)",
              border: "0.5px solid rgba(124,58,237,0.4)",
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-20"
              style={{ background: "#7c3aed" }}
            />
            <div className="relative">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(124,58,237,0.3)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/>
                </svg>
              </div>
              <h2 className="text-white font-semibold text-lg mb-2">Manager</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#c4b5fd" }}>
                Pilotez votre boutique, analysez les performances et guidez votre équipe.
              </p>
            </div>
            <div
              className="absolute bottom-5 right-5 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.35)", color: "#e9d5ff" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>

          {/* Conseiller */}
          <Link
            href="/choix"
            className="rounded-2xl p-8 text-left relative overflow-hidden block transition-all duration-300 hover:-translate-y-2"
            style={{
              background: "linear-gradient(145deg, #13111e, #1e1b4b)",
              border: "0.5px solid rgba(167,139,250,0.25)",
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-10"
              style={{ background: "#a78bfa" }}
            />
            <div className="relative">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(167,139,250,0.15)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h2 className="text-white font-semibold text-lg mb-2">Conseiller</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#a78bfa" }}>
                Suivez vos missions, défiez vos collègues et atteignez vos objectifs du jour.
              </p>
            </div>
            <div
              className="absolute bottom-5 right-5 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>

        </div>
      </div>

      {/* Spacer bas */}
      <div />

    </main>
  );
}
