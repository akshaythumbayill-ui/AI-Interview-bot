import React, { useEffect, useRef } from "react";

export default function Transcript({ text, isListening }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [text]);

  if (!text && !isListening) return null;

  return (
    <div className="w-full rounded-xl px-4 py-3 text-sm leading-relaxed transition-all duration-300"
      style={{
        background: isListening ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
        minHeight: 56,
      }}>
      <div className="flex items-center gap-2 mb-2">
        {isListening && (
          <div className="flex items-center gap-0.5">
            {[0,1,2].map((i) => (
              <div key={i} className="w-1 rounded-full"
                style={{ height: 10, background: "rgba(252,165,165,0.8)",
                  animation: `soundWave 0.7s ease-in-out ${i*0.15}s infinite alternate` }} />
            ))}
          </div>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: isListening ? "rgba(252,165,165,0.7)" : "rgba(161,161,170,0.6)" }}>
          {isListening ? "Listening" : "Your answer"}
        </span>
      </div>
      <p className={`text-zinc-300 ${isListening && !text ? "typing-cursor" : ""}`}
        style={{ wordBreak: "break-word" }}>
        {text || <span className="text-zinc-600 italic">Start speaking…</span>}
      </p>
      <div ref={endRef} />
    </div>
  );
}
