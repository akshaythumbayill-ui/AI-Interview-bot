import React, { useState, useRef } from "react";
import { startInterview } from "../api/client";
import { useNavigate } from "react-router-dom";

const ROLES = [
  { value: "Python Developer",     icon: "🐍" },
  { value: "AI/ML Engineer",       icon: "🤖" },
  { value: "Full Stack Developer", icon: "⚡" },
  { value: "Data Analyst",         icon: "📊" },
  { value: "Frontend Developer",   icon: "🎨" },
  { value: "Backend Developer",    icon: "🔧" },
  { value: "DevOps Engineer",      icon: "☁️" },
];
const TYPES = [
  { value: "Mixed",             desc: "Balanced mix of all types",       icon: "🔀" },
  { value: "Technical",         desc: "Deep technical concepts",          icon: "💻" },
  { value: "HR/Behavioral",     desc: "Soft skills & situational",        icon: "🤝" },
  { value: "Project Deep-Dive", desc: "Walk through your past work",      icon: "🔍" },
];
const DIFFICULTIES = [
  { value: "Beginner",     desc: "0–1 years experience" },
  { value: "Intermediate", desc: "1–3 years experience" },
];

function OptionCard({ selected, onClick, label, sublabel, icon }) {
  return (
    <button type="button" onClick={onClick}
      className="relative flex flex-col gap-1 p-3.5 rounded-xl text-left transition-all duration-200 focus-ring"
      style={{
        background: selected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: selected ? "0 1px 0 rgba(255,255,255,0.08) inset" : "none",
      }}>
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "#ffffff" }}>
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {icon && <span className="text-xl leading-none">{icon}</span>}
      <span className="text-sm font-semibold" style={{ color: selected ? "#ffffff" : "#a1a1aa" }}>
        {label}
      </span>
      {sublabel && (
        <span className="text-xs" style={{ color: selected ? "rgba(228,228,231,0.6)" : "rgba(113,113,122,0.7)" }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

export default function SetupForm() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);
  const [form, setForm] = useState({
    role: "Python Developer", interview_type: "Mixed",
    difficulty: "Beginner",   num_questions: 10, job_description: "",
  });
  const [resume, setResume]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [jdOpen, setJdOpen]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (resume) fd.append("resume", resume);
      const { data } = await startInterview(fd);
      navigate(`/interview/${data.session_id}`, { state: data });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start. Is the backend running?");
    } finally { setLoading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setResume(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* Resume upload */}
      <div>
        <label className="field-label">Resume PDF</label>
        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200 group"
          style={{
            borderColor: resume ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
            background:  resume ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
          }}>
          {resume ? (
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                    fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                  <path d="M14 2v6h6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-200">{resume.name}</p>
                <p className="text-xs text-zinc-500">{(resume.size / 1024).toFixed(0)} KB · PDF ready</p>
              </div>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setResume(null); }}
                className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: "#71717a" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#fca5a5"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>
                ✕
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm transition-colors duration-200"
                style={{ color: "#71717a" }}>
                Drop your PDF here or{" "}
                <span className="font-medium" style={{ color: "#a1a1aa" }}>click to browse</span>
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(113,113,122,0.6)" }}>
                Optional — enables resume-aware questions
              </p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => setResume(e.target.files[0] || null)} />
      </div>

      {/* Role */}
      <div>
        <label className="field-label">Target Role</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <OptionCard key={r.value} label={r.value} icon={r.icon}
              selected={form.role === r.value}
              onClick={() => setForm((p) => ({ ...p, role: r.value }))} />
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="field-label">Interview Type</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <OptionCard key={t.value} label={t.value} sublabel={t.desc} icon={t.icon}
              selected={form.interview_type === t.value}
              onClick={() => setForm((p) => ({ ...p, interview_type: t.value }))} />
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="field-label">Difficulty</label>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((d) => (
            <OptionCard key={d.value} label={d.value} sublabel={d.desc}
              selected={form.difficulty === d.value}
              onClick={() => setForm((p) => ({ ...p, difficulty: d.value }))} />
          ))}
        </div>
      </div>

      {/* Questions slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="field-label mb-0">Number of Questions</label>
          <div className="px-2.5 py-0.5 rounded-lg text-sm font-bold font-mono"
            style={{ background: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}>
            {form.num_questions}
          </div>
        </div>
        <input type="range" min={3} max={15} value={form.num_questions}
          onChange={(e) => setForm((p) => ({ ...p, num_questions: +e.target.value }))}
          className="w-full appearance-none cursor-pointer"
          style={{ height: 4,
            background: `linear-gradient(to right, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.7) ${((form.num_questions - 3) / 12) * 100}%, rgba(255,255,255,0.1) ${((form.num_questions - 3) / 12) * 100}%, rgba(255,255,255,0.1) 100%)`,
            borderRadius: 999, outline: "none" }} />
        <div className="flex justify-between text-xs mt-1.5" style={{ color: "rgba(113,113,122,0.6)" }}>
          <span>3 · Quick</span><span>10 · Standard</span><span>15 · Deep</span>
        </div>
      </div>

      {/* JD collapsible */}
      <div>
        <button type="button" onClick={() => setJdOpen((p) => !p)}
          className="flex items-center gap-2 w-full text-left">
          <label className="field-label mb-0 cursor-pointer">Job Description</label>
          <span className="text-xs" style={{ color: "rgba(113,113,122,0.6)" }}>— optional</span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-auto transition-transform duration-200"
            style={{ color: "#52525b", transform: jdOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {jdOpen && (
          <div className="mt-2 animate-fade-in">
            <textarea name="job_description" value={form.job_description}
              onChange={(e) => setForm((p) => ({ ...p, job_description: e.target.value }))}
              rows={4} placeholder="Paste the job description here…"
              className="input-field resize-none text-sm mt-2" />
            <p className="text-xs mt-1" style={{ color: "rgba(113,113,122,0.5)" }}>
              Tailors questions to match specific role requirements.
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm animate-fade-up"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
            </svg>
            Setting up your interview…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" opacity="0.9"/>
              <path d="M5 10a7 7 0 0014 0M12 18v3M9 21h6"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            </svg>
            Start Interview
          </>
        )}
      </button>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: white; border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 2px 8px rgba(0,0,0,0.5); cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
      `}</style>
    </form>
  );
}
