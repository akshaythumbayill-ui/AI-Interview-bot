import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "../api/client";
import HistoryChart from "../components/HistoryChart";
import DashboardNav from "../components/DashboardNav";

const ROLE_ICONS = {
  "Python Developer": "🐍", "AI/ML Engineer": "🤖", "Full Stack Developer": "⚡",
  "Data Analyst": "📊", "Frontend Developer": "🎨", "Backend Developer": "🔧", "DevOps Engineer": "☁️",
};

function ScoreDot({ score }) {
  if (score == null) return <span className="font-mono text-sm" style={{ color: "rgba(113,113,122,0.5)" }}>—</span>;
  const opacity = score >= 7 ? 0.9 : score >= 4 ? 0.6 : 0.4;
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full"
        style={{ background: `rgba(255,255,255,${opacity})` }} />
      <span className="text-base font-bold font-mono"
        style={{ color: score >= 7 ? "#e4e4e7" : score >= 4 ? "#a1a1aa" : "#fca5a5" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const scoredSessions = sessions.filter((session) => session.overall_score != null);
  const bestScore = scoredSessions.length
    ? Math.max(...scoredSessions.map((session) => session.overall_score)).toFixed(1)
    : "—";

  useEffect(() => {
    getHistory()
      .then(({ data }) => setSessions(data.sessions || []))
      .catch((err) => setError(err.response?.data?.detail || "Could not load history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-bg min-h-screen">
      <DashboardNav />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-2xl font-bold text-white">Session History</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(113,113,122,0.6)" }}>
            Your progress across all practice sessions
          </p>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="rounded-2xl h-20 shimmer" />)}
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            ⚠ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sessions.length === 0 && (
          <div className="glass-card p-16 text-center animate-fade-up">
            <div className="text-5xl mb-4">🎙️</div>
            <h3 className="text-lg font-semibold text-white mb-2">No sessions yet</h3>
            <p className="text-sm mb-6" style={{ color: "rgba(113,113,122,0.6)" }}>
              Start your first interview to begin tracking progress.
            </p>
            <Link to="/" className="btn-primary">Start Interview</Link>
          </div>
        )}

        {sessions.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-up">
              {[
                { label: "Sessions",  value: sessions.length },
                { label: "Completed", value: sessions.filter((s) => s.status === "completed").length },
                {
                  label: "Best Score",
                  value: bestScore,
                  suffix: bestScore === "—" ? "" : "/10",
                },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-4 text-center"
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="text-2xl font-black font-mono text-white">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-sm font-normal ml-0.5"
                        style={{ color: "rgba(113,113,122,0.6)" }}>{stat.suffix}</span>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "rgba(113,113,122,0.6)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <HistoryChart sessions={sessions} />
            </div>

            {/* Session list */}
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <div key={s.session_id}
                  className="glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up"
                  style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "both" }}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {ROLE_ICONS[s.role] || "💼"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-zinc-200">{s.role}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            color: s.status === "completed" ? "rgba(228,228,231,0.7)" : "rgba(161,161,170,0.6)",
                            background: s.status === "completed" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(113,113,122,0.6)" }}>
                        {s.interview_type} · {s.difficulty} · {s.num_questions}Q ·{" "}
                        {new Date(s.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <ScoreDot score={s.overall_score} />
                    {s.status === "completed" && (
                      <Link to={`/report/${s.session_id}`} className="btn-ghost text-xs">
                        Report →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
