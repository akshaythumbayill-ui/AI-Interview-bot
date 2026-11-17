import React from "react";

export default function MicButton({ isListening, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      title={isListening ? "Stop recording" : "Start voice answer"}
      className="relative focus-ring" style={{ outline: "none" }}>

      {isListening && (
        <>
          <div className="mic-ripple" />
          <div className="mic-ripple-2" />
        </>
      )}

      <div className="relative flex items-center justify-center rounded-full transition-all duration-300"
        style={{ width: 80, height: 80,
          background: isListening
            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            : disabled
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.08)",
          border: isListening
            ? "1px solid rgba(239,68,68,0.5)"
            : `1px solid rgba(255,255,255,${disabled ? 0.05 : 0.14})`,
          boxShadow: isListening
            ? "0 0 24px rgba(239,68,68,0.5), 0 1px 0 rgba(255,255,255,0.15) inset"
            : disabled
            ? "none"
            : "0 0 12px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          transform: isListening ? "scale(1.05)" : "scale(1)" }}>

        {isListening ? (
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3"
              fill={disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"} />
            <path d="M5 10a7 7 0 0014 0"
              stroke={disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"}
              strokeWidth="2" strokeLinecap="round" fill="none" />
            <line x1="12" y1="17" x2="12" y2="21"
              stroke={disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"}
              strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="21" x2="15" y2="21"
              stroke={disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"}
              strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </button>
  );
}
