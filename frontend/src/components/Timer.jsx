import React, { useState, useEffect, useRef } from "react";

export default function Timer({ questionNumber, running = true }) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => { setSeconds(0); }, [questionNumber]);
  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, questionNumber]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const urgent = seconds >= 120;
  const warn   = seconds >= 60 && !urgent;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-sm font-semibold transition-all duration-500"
      style={{
        color: urgent ? "#fca5a5" : warn ? "#d4d4d8" : "rgba(161,161,170,0.7)",
        background: urgent ? "rgba(239,68,68,0.1)" : "transparent",
        border: `1px solid ${urgent ? "rgba(239,68,68,0.2)" : "transparent"}`,
      }}>
      <div className="w-1.5 h-1.5 rounded-full"
        style={{ background: urgent ? "#ef4444" : "rgba(161,161,170,0.4)" }} />
      {mm}:{ss}
    </div>
  );
}
