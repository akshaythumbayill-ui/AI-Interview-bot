import React, { useState, useRef, useEffect } from "react";

export default function ChatBox({ onSubmit, disabled, placeholder = "Type your answer…" }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const hasContent = value.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-end gap-3 rounded-2xl p-3 transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${hasContent ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: hasContent ? "0 0 0 3px rgba(255,255,255,0.04)" : "none",
        }}>
        <textarea ref={textareaRef} value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          disabled={disabled} placeholder={placeholder} rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-zinc-200
                     placeholder-zinc-600 focus:outline-none leading-relaxed py-1"
          style={{ maxHeight: 160 }}
        />

        <button type="submit" disabled={disabled || !hasContent}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl
                     transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: hasContent && !disabled ? "#ffffff" : "rgba(255,255,255,0.06)",
            boxShadow: hasContent && !disabled ? "0 2px 8px rgba(0,0,0,0.5)" : "none",
            transform: hasContent && !disabled ? "scale(1.05)" : "scale(1)",
          }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
            <path d="M12 20V4M5 11l7-7 7 7"
              stroke={hasContent && !disabled ? "#0a0a0a" : "rgba(255,255,255,0.4)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="text-[11px] mt-1.5 ml-1" style={{ color: "rgba(113,113,122,0.6)" }}>
        Press <kbd className="px-1 py-0.5 rounded font-mono text-[10px]"
          style={{ background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>Enter</kbd> to send ·{" "}
        <kbd className="px-1 py-0.5 rounded font-mono text-[10px]"
          style={{ background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>Shift+Enter</kbd> for new line
      </p>
    </form>
  );
}
