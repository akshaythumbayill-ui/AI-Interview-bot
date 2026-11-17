import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { submitAnswer } from "../api/client";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import AvatarOrb from "../components/AvatarOrb";
import MicButton from "../components/MicButton";
import ChatBox from "../components/ChatBox";
import Transcript from "../components/Transcript";
import Timer from "../components/Timer";
import { useAuth } from "../auth/AuthContext";

function ScorePill({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-base font-bold font-mono text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-medium"
        style={{ color: "rgba(113,113,122,0.7)" }}>{label}</div>
    </div>
  );
}

function EndModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="glass-card p-7 max-w-sm w-full text-center animate-scale-in"
        style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 32px 80px rgba(0,0,0,0.8)" }}>
        <div className="text-4xl mb-4">🏁</div>
        <h3 className="text-lg font-bold text-white mb-2">End interview?</h3>
        <p className="text-sm mb-6" style={{ color: "rgba(113,113,122,0.8)" }}>
          Your progress will be saved and your report will be generated.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Keep going</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white",
              boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}>
            End & Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  const { sessionId }   = useParams();
  const location        = useLocation();
  const navigate        = useNavigate();
  const initData        = location.state;
  const { signOut } = useAuth();

  const [question, setQuestion]             = useState(initData?.first_question || "");
  const [questionNumber, setQuestionNumber] = useState(initData?.question_number || 1);
  const [totalQuestions]                    = useState(initData?.total_questions || 10);
  const [loading, setLoading]               = useState(false);
  const [done, setDone]                     = useState(false);
  const [feedback, setFeedback]             = useState(null);
  const [speechError, setSpeechError]       = useState("");
  const [inputMode, setInputMode]           = useState("voice");
  const [pendingAnswer, setPendingAnswer]   = useState("");
  const [showEndModal, setShowEndModal]     = useState(false);
  const [questionVisible, setQuestionVisible] = useState(true);

  const { speak, cancel: cancelTTS, isSpeaking } = useSpeechSynthesis();
  const handleSTTEnd = useCallback((text) => { setPendingAnswer(text); }, []);
  const { isListening, transcript, error: sttError, isSupported: speechSupported,
    startListening, stopListening, resetTranscript, getDuration } =
    useSpeechRecognition({ onEnd: handleSTTEnd });

  useEffect(() => {
    if (question) {
      setQuestionVisible(false);
      setTimeout(() => { setQuestionVisible(true); speak(question); }, 80);
    }
  }, [question]); // eslint-disable-line
  useEffect(() => { if (!speechSupported) setInputMode("chat"); }, [speechSupported]);
  useEffect(() => { if (sttError) setSpeechError(sttError); }, [sttError]);

  const submitAnswerToBackend = useCallback(async (answerText, mode, durationSecs) => {
    if (!answerText.trim()) return;
    cancelTTS(); setLoading(true); setFeedback(null);
    try {
      const { data } = await submitAnswer({ session_id: sessionId, answer_text: answerText, input_mode: mode, duration_seconds: durationSecs || null });
      setFeedback(data.evaluation);
      if (data.done || !data.next_question) {
        setDone(true);
        setTimeout(() => navigate(`/report/${sessionId}`), 3200);
      } else {
        setQuestion(data.next_question);
        setQuestionNumber(data.question_number + 1);
        setPendingAnswer(""); resetTranscript();
      }
    } catch (err) {
      setSpeechError(err.response?.data?.detail || "Failed to submit. Try again.");
    } finally { setLoading(false); }
  }, [sessionId, cancelTTS, navigate, resetTranscript]); // eslint-disable-line

  useEffect(() => {
    if (!isListening && pendingAnswer.trim() && inputMode === "voice")
      submitAnswerToBackend(pendingAnswer, "voice", getDuration());
  }, [isListening]); // eslint-disable-line

  const handleMicClick = () => {
    if (isListening) stopListening();
    else { setSpeechError(""); setPendingAnswer(""); resetTranscript(); startListening(); }
  };

  if (!initData) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-500 mb-4">Session not found.</p>
        <a href="/" className="btn-primary">← Back to setup</a>
      </div>
    </div>
  );

  const progress = ((questionNumber - 1) / totalQuestions) * 100;
  const avgScore = feedback
    ? ((feedback.score_technical + feedback.score_clarity + feedback.score_depth) / 3).toFixed(1)
    : null;

  return (
    <div className="page-bg min-h-screen">
      {showEndModal && <EndModal onConfirm={() => navigate(`/report/${sessionId}`)} onCancel={() => setShowEndModal(false)} />}

      {/* Top bar */}
      <header className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "rgba(10,10,10,0.9)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
            <span className="text-sm font-semibold text-white truncate">{initData?.role}</span>
            <span className="text-zinc-600 text-sm hidden sm:inline">·</span>
            <span className="text-zinc-600 text-sm hidden sm:inline">{initData?.interview_type}</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs font-mono" style={{ color: "rgba(113,113,122,0.7)" }}>
              Q {questionNumber}/{totalQuestions}
            </span>
            <div className="w-28 progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={signOut} className="btn-ghost text-xs px-2">Sign out</button>
            <Timer questionNumber={questionNumber} running={!loading && !done} />
            <button onClick={() => setShowEndModal(true)} className="btn-danger text-xs px-3 py-1.5">End</button>
          </div>
        </div>
        {/* Mobile progress */}
        <div className="sm:hidden mt-2 max-w-3xl mx-auto">
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-6">
          <AvatarOrb isSpeaking={isSpeaking} isThinking={loading} />

          {/* Question card */}
          <div className="w-full rounded-2xl p-6 transition-all duration-500"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px rgba(0,0,0,0.4)",
              opacity: questionVisible ? 1 : 0, transform: questionVisible ? "translateY(0)" : "translateY(8px)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(161,161,170,0.6)" }}>Question {questionNumber}</span>
              {isSpeaking && (
                <div className="flex items-center gap-1.5">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-1 rounded-full"
                      style={{ height: 14, background: "rgba(255,255,255,0.4)",
                        animation: `soundWave 0.7s ease-in-out ${i*0.15}s infinite alternate` }} />
                  ))}
                  <span className="text-xs ml-1" style={{ color: "rgba(113,113,122,0.6)" }}>Speaking</span>
                </div>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="shimmer h-5 rounded-lg w-full" />
                <div className="shimmer h-5 rounded-lg w-3/4" />
              </div>
            ) : done ? (
              <div className="text-center py-2">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-lg font-semibold text-white">Interview complete!</p>
                <p className="text-sm mt-1" style={{ color: "rgba(113,113,122,0.7)" }}>Generating your detailed report…</p>
                <div className="mt-3 flex justify-center gap-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.4)",
                      animation: `bounceDot 0.8s ease-in-out ${i*0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xl font-medium text-white leading-relaxed">{question}</p>
            )}
          </div>
        </div>

        {/* Feedback strip */}
        {feedback && !loading && (
          <div className="rounded-2xl p-5 animate-fade-up"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(161,161,170,0.6)" }}>Last Answer</span>
              <div className="flex items-center gap-4">
                <ScorePill label="Tech"    value={feedback.score_technical?.toFixed(1)} />
                <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
                <ScorePill label="Clarity" value={feedback.score_clarity?.toFixed(1)} />
                <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
                <ScorePill label="Depth"   value={feedback.score_depth?.toFixed(1)} />
                {avgScore && (
                  <>
                    <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
                    <ScorePill label="Avg" value={avgScore} />
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{feedback.feedback}</p>
          </div>
        )}

        {/* Input area */}
        {!done && (
          <div className="glass-card p-5">
            {/* Mode toggle */}
            {speechSupported && (
              <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[{ id: "voice", label: "🎙 Voice" }, { id: "chat", label: "⌨️ Chat" }].map((m) => (
                  <button key={m.id} onClick={() => setInputMode(m.id)}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: inputMode === m.id ? "rgba(255,255,255,0.1)" : "transparent",
                      color: inputMode === m.id ? "#ffffff" : "rgba(113,113,122,0.8)",
                      border: `1px solid ${inputMode === m.id ? "rgba(255,255,255,0.18)" : "transparent"}`,
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {inputMode === "voice" && (
              <div className="flex flex-col items-center gap-5">
                <MicButton isListening={isListening} onClick={handleMicClick}
                  disabled={loading || isSpeaking} />
                <p className="text-sm text-center"
                  style={{ color: isListening ? "#fca5a5" : "rgba(113,113,122,0.6)" }}>
                  {isListening ? "Recording — click stop when done"
                   : isSpeaking ? "Wait for the question to finish…"
                   : "Click to record your answer"}
                </p>
                <div className="w-full">
                  <Transcript text={transcript || pendingAnswer} isListening={isListening} />
                </div>
              </div>
            )}

            {inputMode === "chat" && (
              <ChatBox onSubmit={(t) => submitAnswerToBackend(t, "chat", null)} disabled={loading} />
            )}
          </div>
        )}

        {/* Error */}
        {speechError && (
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm animate-fade-up"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            <span className="shrink-0">⚠</span>
            <span className="flex-1">{speechError}</span>
            <button onClick={() => setSpeechError("")} className="shrink-0 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Controls */}
        {!done && !loading && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => { cancelTTS(); speak(question); }} disabled={isSpeaking} className="btn-ghost gap-2 disabled:opacity-30">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
              </svg>
              Repeat
            </button>
            <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.08)" }} />
            <button onClick={() => submitAnswerToBackend("I would like to skip this question.", "chat", null)}
              disabled={isListening} className="btn-ghost gap-2 disabled:opacity-30">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.288 4.818A1.5 1.5 0 001 6.095v7.81a1.5 1.5 0 002.288 1.276l6.323-3.905c.155-.096.285-.213.389-.344v2.973a1.5 1.5 0 002.288 1.276l6.323-3.905a1.5 1.5 0 000-2.552L12.288 4.82A1.5 1.5 0 0010 6.095v2.973a1.587 1.587 0 00-.389-.344L3.288 4.818z"/>
              </svg>
              Skip
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
