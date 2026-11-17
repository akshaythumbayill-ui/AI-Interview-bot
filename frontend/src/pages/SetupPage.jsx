import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SetupForm from "../components/SetupForm";
import DashboardNav from "../components/DashboardNav";
import { getHistory } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const FEATURES = [
  { icon: "🎙️", title: "Voice-first",   desc: "Answer by speaking — real interview feel" },
  { icon: "🧠", title: "AI-Adaptive",   desc: "Questions adjust to your answer quality" },
  { icon: "📄", title: "Resume-aware",  desc: "Questions reference your actual projects" },
  { icon: "📊", title: "Deep feedback", desc: "Per-answer scores, model answers & PDF report" },
];

export default function SetupPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    getHistory()
      .then(({ data }) => setSessions(data.sessions || []))
      .catch((error) => setHistoryError(error.response?.data?.detail || "Could not load your dashboard stats."));
  }, []);

  const scoredSessions = sessions.filter((session) => session.overall_score != null);
  const bestScore = scoredSessions.length
    ? Math.max(...scoredSessions.map((session) => session.overall_score)).toFixed(1)
    : "—";

  return (
    <div className="page-bg min-h-screen relative overflow-hidden">
      <DashboardNav />
      {/* Very subtle top glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <section className="mb-8 animate-fade-up">
          <p className="text-sm text-zinc-500">Welcome back{user?.full_name ? `, ${user.full_name}` : ""}</p>
          <h1 className="text-3xl font-bold text-white mt-1">Your interview dashboard</h1>
          <p className="text-sm text-zinc-500 mt-2">Prepare for your next opportunity and keep track of your progress.</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" aria-label="Interview statistics">
          {[
            { label: "Total sessions", value: sessions.length },
            { label: "Completed", value: sessions.filter((session) => session.status === "completed").length },
            { label: "Best score", value: bestScore, suffix: bestScore === "—" ? "" : "/10" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500">{stat.label}</p>
              <p className="text-2xl font-bold font-mono text-white mt-2">
                {stat.value}<span className="text-xs text-zinc-500 ml-1">{stat.suffix}</span>
              </p>
            </div>
          ))}
        </section>
        {historyError && <p role="alert" className="text-sm text-red-300 mb-6">{historyError}</p>}

      <div className="flex flex-col lg:flex-row gap-12 items-center justify-center">

        {/* ── Left: hero ── */}
        <div className="flex-1 max-w-lg text-center lg:text-left animate-fade-up">

          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl"
              style={{ background: "#ffffff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.9) inset" }}>
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" fill="#0a0a0a" />
                <path d="M5 10a7 7 0 0014 0M12 18v3M9 21h6"
                  stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "rgba(161,161,170,0.7)" }}>MockingBird</span>
          </div>

          <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
            <span className="text-white">Ace your next</span>
            <br />
            <span className="gradient-text">tech interview</span>
          </h2>

          <p className="text-lg leading-relaxed mb-10 max-w-md"
            style={{ color: "rgba(161,161,170,0.8)" }}>
            Practice with a voice-first AI interviewer that knows your resume,
            adapts to your answers, and gives you honest feedback.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl animate-fade-up"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  animationDelay: `${i * 0.08}s`, animationFillMode: "both" }}>
                <span className="text-xl mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(113,113,122,0.8)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/history"
            className="inline-flex items-center gap-2 text-sm transition-colors duration-200"
            style={{ color: "rgba(113,113,122,0.7)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#a1a1aa"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(113,113,122,0.7)"}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clipRule="evenodd" />
            </svg>
            View past sessions
          </Link>
        </div>

        {/* ── Right: form ── */}
        <div className="w-full max-w-md animate-scale-in"
          style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <div className="glass-card p-7"
            style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 32px 80px rgba(0,0,0,0.7)" }}>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Set up your session</h2>
              <p className="text-sm mt-1" style={{ color: "rgba(113,113,122,0.8)" }}>
                Configure and start in under 30 seconds
              </p>
            </div>
            <SetupForm />
          </div>
        </div>

      </div>
      </main>
    </div>
  );
}
