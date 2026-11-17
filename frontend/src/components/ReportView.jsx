import React, { useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";
import { getReportPdf } from "../api/client";

/* Animated score ring */
function ScoreRing({ score, label, size = 100 }) {
  const [displayed, setDisplayed] = useState(0);
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(displayed, 10) / 10) * circ;

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 1100;
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      setDisplayed(ease * (score || 0));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.07} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.75)" strokeWidth={size*0.07}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2 - 2} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={size*0.2} fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {displayed.toFixed(1)}
        </text>
        <text x={size/2} y={size/2 + size*0.17} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(113,113,122,0.6)" fontSize={size*0.1} fontFamily="Inter, sans-serif">
          /10
        </text>
      </svg>
      <span className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "rgba(113,113,122,0.7)" }}>{label}</span>
    </div>
  );
}

/* Per-question expandable card */
function QuestionCard({ qa, index }) {
  const [open, setOpen] = useState(false);
  const avg = ((qa.score_technical + qa.score_clarity + qa.score_depth) / 3);
  const scoreColor = avg >= 7 ? "#e4e4e7" : avg >= 4 ? "#a1a1aa" : "#fca5a5";

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ background: open ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${open ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}` }}
      onClick={() => setOpen((p) => !p)}>
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer">
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(161,161,170,0.6)" }}>
          {qa.question_number}
        </div>
        <p className="flex-1 text-sm font-medium text-zinc-200 line-clamp-1">{qa.question}</p>
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right">
            <div className="text-base font-bold font-mono" style={{ color: scoreColor }}>{avg.toFixed(1)}</div>
            <div className="text-[10px]" style={{ color: "rgba(113,113,122,0.6)" }}>avg</div>
          </div>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform duration-300"
            style={{ color: "rgba(113,113,122,0.5)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t animate-fade-in"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
          onClick={(e) => e.stopPropagation()}>
          {/* Score bars */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { label: "Technical", val: qa.score_technical },
              { label: "Clarity",   val: qa.score_clarity   },
              { label: "Depth",     val: qa.score_depth     },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "rgba(113,113,122,0.7)" }}>{s.label}</span>
                  <span className="font-mono font-bold text-zinc-300">{s.val?.toFixed(1)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill transition-all duration-700"
                    style={{ width: `${((s.val||0)/10)*100}%`,
                      background: `rgba(255,255,255,${0.3 + ((s.val||0)/10)*0.5})` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Speech badges */}
          {(qa.filler_word_count > 0 || qa.words_per_minute) && (
            <div className="flex flex-wrap gap-2">
              {qa.filler_word_count > 0 && (
                <span className="badge-amber">🗣 {qa.filler_word_count} filler word{qa.filler_word_count > 1 ? "s" : ""}</span>
              )}
              {qa.words_per_minute && (
                <span className="badge-slate">⚡ {qa.words_per_minute.toFixed(0)} WPM</span>
              )}
            </div>
          )}

          {qa.answer && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "rgba(113,113,122,0.5)" }}>Your Answer</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{qa.answer}</p>
            </div>
          )}

          {qa.feedback && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "rgba(113,113,122,0.5)" }}>Feedback</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{qa.feedback}</p>
            </div>
          )}

          {qa.ideal_answer_summary && (
            <div className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: "rgba(228,228,231,0.6)" }}>Model Answer</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{qa.ideal_answer_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Chart tooltip */
const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-sm"
      style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
      <p className="font-mono font-bold text-white">{payload[0].value?.toFixed(1)} / 10</p>
    </div>
  );
};

export default function ReportView({ report }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  if (!report) return null;

  const radarData = [
    { subject: "Technical", score: report.score_technical_avg || 0 },
    { subject: "Clarity",   score: report.score_clarity_avg  || 0 },
    { subject: "Depth",     score: report.score_depth_avg    || 0 },
  ];
  const barData = report.per_question.map((q) => ({
    name: `Q${q.question_number}`,
    avg: +((q.score_technical + q.score_clarity + q.score_depth) / 3).toFixed(2),
  }));

  const overall = report.overall_score || 0;
  const grade = overall >= 8 ? "Excellent" : overall >= 6 ? "Good" : overall >= 4 ? "Fair" : "Needs Work";
  const gradeColor = overall >= 8 ? "#e4e4e7" : overall >= 6 ? "#d4d4d8" : overall >= 4 ? "#a1a1aa" : "#fca5a5";

  const downloadPdf = async () => {
    setPdfLoading(true);
    setPdfError("");
    try {
      const { data } = await getReportPdf(report.session_id);
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `report_${report.session_id.slice(0, 8)}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      const detail = error.response?.data?.detail;
      setPdfError(typeof detail === "string" ? detail : "Could not download the PDF report.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge-slate">{report.role}</span>
              <span className="badge-slate">{report.interview_type}</span>
              <span className="badge-slate">{report.difficulty}</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Interview Complete</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black font-mono" style={{ color: gradeColor }}>{overall.toFixed(1)}</span>
              <span className="text-zinc-600 text-sm">/10 ·</span>
              <span className="text-sm font-semibold" style={{ color: gradeColor }}>{grade}</span>
            </div>
          </div>
          <button type="button" onClick={downloadPdf} disabled={pdfLoading} className="btn-ghost flex items-center gap-2 shrink-0 self-start sm:self-center">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
            </svg>
            {pdfLoading ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
        {pdfError && <p role="alert" className="text-sm text-red-300 mt-3">{pdfError}</p>}
      </div>

      {/* Score rings */}
      <div className="glass-card p-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-6"
          style={{ color: "rgba(113,113,122,0.6)" }}>Category Scores</p>
        <div className="flex flex-wrap gap-6 justify-around">
          <ScoreRing score={report.overall_score}       label="Overall"   size={110} />
          <ScoreRing score={report.score_technical_avg} label="Technical" size={90}  />
          <ScoreRing score={report.score_clarity_avg}   label="Clarity"   size={90}  />
          <ScoreRing score={report.score_depth_avg}     label="Depth"     size={90}  />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "rgba(113,113,122,0.6)" }}>Skill Radar</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject"
                tick={{ fill: "rgba(161,161,170,0.7)", fontSize: 11, fontFamily: "Inter" }} />
              <PolarRadiusAxis angle={90} domain={[0,10]} tick={false} axisLine={false} />
              <Radar dataKey="score"
                stroke="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.08)"
                strokeWidth={1.5} dot={{ fill: "rgba(255,255,255,0.7)", r: 3 }} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "rgba(113,113,122,0.6)" }}>Per-Question Avg</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={18} margin={{ top:5, right:5, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill:"rgba(161,161,170,0.6)", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,10]} tick={{ fill:"rgba(100,116,139,0.5)", fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="avg" radius={[6,6,0,0]}>
                {barData.map((entry, i) => (
                  <Cell key={i}
                    fill={`rgba(255,255,255,${entry.avg >= 7 ? 0.75 : entry.avg >= 4 ? 0.4 : 0.2})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths & weak areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(228,228,231,0.7)" }}>✓</div>
            <p className="text-sm font-semibold text-zinc-200">Strengths</p>
          </div>
          <ul className="space-y-2.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400 animate-fade-up"
                style={{ animationDelay: `${i*0.07}s`, animationFillMode: "both" }}>
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "rgba(255,255,255,0.5)" }} />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-5" style={{ borderColor: "rgba(239,68,68,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>→</div>
            <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>Areas to Improve</p>
          </div>
          <ul className="space-y-2.5">
            {report.weak_areas.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400 animate-fade-up"
                style={{ animationDelay: `${i*0.07}s`, animationFillMode: "both" }}>
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "rgba(239,68,68,0.5)" }} />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Improvement plan */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"
            style={{ color: "rgba(228,228,231,0.6)" }}>
            <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.897l-2.051-.684a1 1 0 01-.633-.633L6.95 5.684z" />
          </svg>
          <p className="text-sm font-semibold text-zinc-200">Improvement Plan</p>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">{report.improvement_plan}</p>
      </div>

      {/* Q&A breakdown */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: "rgba(113,113,122,0.6)" }}>Question Breakdown · click to expand</p>
        <div className="space-y-2">
          {report.per_question.map((qa, i) => (
            <QuestionCard key={qa.question_number} qa={qa} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
