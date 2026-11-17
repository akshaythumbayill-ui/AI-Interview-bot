import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReport } from "../api/client";
import ReportView from "../components/ReportView";
import DashboardNav from "../components/DashboardNav";

function LoadingState() {
  return (
    <div className="page-bg min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute inset-0 rounded-full"
          style={{ border: "2px solid transparent", borderTopColor: "rgba(255,255,255,0.6)",
            animation: "spin 0.9s linear infinite" }} />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">Generating your report</p>
        <p className="text-sm mt-1" style={{ color: "rgba(113,113,122,0.6)" }}>This takes a few seconds…</p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    getReport(sessionId)
      .then(({ data }) => setReport(data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load report."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <LoadingState />;

  return (
    <div className="page-bg min-h-screen">
      <DashboardNav />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-6"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            ⚠ {error}
          </div>
        )}
        {report && <ReportView report={report} />}
      </div>
    </div>
  );
}
