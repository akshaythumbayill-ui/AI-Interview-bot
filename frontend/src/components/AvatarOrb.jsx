import React from "react";

function SoundBars({ active }) {
  const heights = [30, 55, 80, 55, 100, 70, 45, 85, 60, 35];
  return (
    <div className="flex items-center gap-[3px] h-8">
      {heights.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{
            height: active ? `${h}%` : "18%",
            background: active ? `rgba(255,255,255,${0.25 + (h / 100) * 0.65})` : "rgba(255,255,255,0.1)",
            transformOrigin: "bottom",
            animation: active
              ? `soundWave ${0.6 + (i % 3) * 0.2}s ease-in-out ${i * 0.07}s infinite alternate`
              : "none",
            transition: "height 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.5)", animation: `bounceDot 1s ease-in-out ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function AvatarOrb({ isSpeaking, isThinking }) {
  const state = isThinking ? "thinking" : isSpeaking ? "speaking" : "idle";

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      <div className="relative flex items-center justify-center">

        {/* Outer glow ring — only while active */}
        {(isSpeaking || isThinking) && (
          <div className="absolute rounded-full"
            style={{ width: 160, height: 160,
              background: "radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)",
              animation: "orbSpeak 2.4s ease-in-out infinite" }}
          />
        )}

        {/* Middle border ring */}
        <div className="absolute rounded-full border"
          style={{ width: 128, height: 128,
            borderColor: isSpeaking ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
            transition: "border-color 0.6s ease",
            animation: isSpeaking ? "orbSpeak 2s ease-in-out 0.3s infinite" : "none" }}
        />

        {/* Core orb */}
        <div className="relative flex items-center justify-center rounded-full overflow-hidden"
          style={{ width: 96, height: 96,
            background: state === "speaking"
              ? "linear-gradient(135deg, #2a2a2a 0%, #111111 100%)"
              : state === "thinking"
              ? "linear-gradient(135deg, #222222 0%, #0d0d0d 100%)"
              : "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
            boxShadow: state === "speaking"
              ? "0 0 32px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.14), 0 1px 0 rgba(255,255,255,0.08) inset"
              : state === "thinking"
              ? "0 0 20px rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.1)"
              : "0 0 0 1px rgba(255,255,255,0.08), 0 1px 0 rgba(255,255,255,0.05) inset",
            animation: isThinking ? "orbThink 1.4s ease-in-out infinite" : "none",
            transition: "background 0.5s ease, box-shadow 0.5s ease" }}
        >
          {/* AI face SVG */}
          <svg viewBox="0 0 48 48" className="w-11 h-11 relative z-10" fill="none">
            <circle cx="24" cy="18" r="10"
              fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
            <circle cx="21" cy="17" r="2"
              fill={state === "idle" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.9)"}
              style={{ filter: state !== "idle" ? "drop-shadow(0 0 3px rgba(255,255,255,0.6))" : "none" }}
            />
            <circle cx="27" cy="17" r="2"
              fill={state === "idle" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.9)"}
              style={{ filter: state !== "idle" ? "drop-shadow(0 0 3px rgba(255,255,255,0.6))" : "none" }}
            />
            <path d="M20 21.5 Q24 24.5 28 21.5"
              stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M12 42 C12 34 16 30 24 30 C32 30 36 34 36 42"
              fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            {state !== "idle" && (
              <>
                <circle cx="38" cy="10" r="1.5" fill="rgba(255,255,255,0.8)"
                  style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.5))" }} />
                <circle cx="42" cy="13" r="1"  fill="rgba(255,255,255,0.5)" />
                <circle cx="40" cy="6"  r="1"  fill="rgba(255,255,255,0.3)" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Status label */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 flex items-center justify-center">
          {state === "thinking" && <ThinkingDots />}
          {state === "speaking" && <SoundBars active />}
          {state === "idle"     && <SoundBars active={false} />}
        </div>
        <div className="text-xs font-medium tracking-wide px-3 py-1 rounded-full transition-all duration-400"
          style={{
            color: state !== "idle" ? "rgba(228,228,231,0.9)" : "rgba(113,113,122,0.8)",
            background: state !== "idle" ? "rgba(255,255,255,0.07)" : "transparent",
            border: state !== "idle" ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
          }}>
          {state === "thinking" ? "Thinking…" : state === "speaking" ? "Speaking" : "AI Interviewer"}
        </div>
      </div>
    </div>
  );
}
