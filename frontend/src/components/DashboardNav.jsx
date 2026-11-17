import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function DashboardNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 px-4 py-3"
      style={{ background: "rgba(10,10,10,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link to="/dashboard" className="text-sm font-semibold text-white">MockingBird</Link>
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Main navigation">
          <Link to="/dashboard" className="btn-ghost text-xs">Dashboard</Link>
          <Link to="/history" className="btn-ghost text-xs">History</Link>
          <span className="hidden sm:inline text-xs text-zinc-500 max-w-36 truncate">
            {user?.full_name || user?.username}
          </span>
          <button type="button" onClick={signOut} className="btn-ghost text-xs">Sign out</button>
        </nav>
      </div>
    </header>
  );
}
