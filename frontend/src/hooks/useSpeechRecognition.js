/**
 * useSpeechRecognition
 * Wraps the browser Web Speech API (SpeechRecognition).
 * Falls back gracefully if the API is unavailable.
 */
import { useState, useRef, useCallback, useEffect } from "react";

const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export function useSpeechRecognition({ onTranscript, onEnd } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [isSupported] = useState(!!SpeechRecognitionAPI);
  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);
  const durationRef = useRef(0);

  // Build a fresh SpeechRecognition instance
  const buildRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null;

    const r = new SpeechRecognitionAPI();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.maxAlternatives = 1;

    r.onstart = () => {
      setIsListening(true);
      setError(null);
      startTimeRef.current = Date.now();
    };

    r.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const combined = (final || interim).trim();
      setTranscript((prev) => (final ? prev + " " + final : prev + " " + interim).trim());
      if (onTranscript) onTranscript(combined, !!final);
    };

    r.onerror = (event) => {
      const msg =
        event.error === "not-allowed"
          ? "Microphone access denied. Please allow mic permission."
          : event.error === "no-speech"
          ? "No speech detected. Please try again."
          : `Speech error: ${event.error}`;
      setError(msg);
      setIsListening(false);
    };

    r.onend = () => {
      setIsListening(false);
      durationRef.current = startTimeRef.current
        ? (Date.now() - startTimeRef.current) / 1000
        : 0;
      if (onEnd) onEnd(transcript, durationRef.current);
    };

    return r;
  }, [onTranscript, onEnd, transcript]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    setTranscript("");
    const r = buildRecognition();
    recognitionRef.current = r;
    try {
      r.start();
    } catch (e) {
      setError("Could not start microphone: " + e.message);
    }
  }, [buildRecognition]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    getDuration: () => durationRef.current,
  };
}
