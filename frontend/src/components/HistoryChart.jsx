import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-sm"
      style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
      <p className="text-xs mb-0.5" style={{ color: "rgba(113,113,122,0.7)" }}>
        {payload[0].payload.role}
      </p>
      <p className="font-bold font-mono text-white">{payload[0].value?.toFixed(1)} / 10</p>
      <p className="text-xs mt-0.5" style={{ color: "rgba(113,113,122,0.5)" }}>
        {payload[0].payload.date}
      </p>
    </div>
  );
};

export default function HistoryChart({ sessions }) {
  const data = sessions
    .filter((s) => s.overall_score != null)
    .slice().reverse()
    .map((s, i) => ({
      session: `#${i + 1}`,
      score: parseFloat((s.overall_score || 0).toFixed(2)),
      role: s.role,
      date: new Date(s.created_at).toLocaleDateString(),
    }));

  if (data.length < 2) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-3xl mb-3">📈</div>
        <p className="text-sm" style={{ color: "rgba(113,113,122,0.7)" }}>
          Complete at least 2 sessions to see your score trend.
        </p>
      </div>
    );
  }

  const avg = data.reduce((s, d) => s + d.score, 0) / data.length;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "rgba(113,113,122,0.6)" }}>Progress Over Time</p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "rgba(113,113,122,0.6)" }}>Avg</span>
          <span className="text-sm font-bold font-mono text-zinc-300">{avg.toFixed(1)}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top:5, right:5, left:-20, bottom:5 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="rgba(255,255,255,0.15)" stopOpacity={1} />
              <stop offset="95%" stopColor="rgba(255,255,255,0)"    stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="session" tick={{ fill:"rgba(161,161,170,0.6)", fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0,10]} tick={{ fill:"rgba(100,116,139,0.5)", fontSize:10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avg} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="score"
            stroke="rgba(255,255,255,0.6)" strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={{ fill: "#141414", stroke: "rgba(255,255,255,0.5)", strokeWidth: 2, r: 4 }}
            activeDot={{ fill: "white", stroke: "#141414", strokeWidth: 2, r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
