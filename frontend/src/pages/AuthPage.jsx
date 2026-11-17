import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { login, register } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, authError, signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", username: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  if (authLoading) return <main className="page-bg min-h-screen" aria-label="Checking account" />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const request = isRegister ? register : login;
      const { data } = await request(form);
      signIn(data.access_token, data.user);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(" ") : detail || "Could not authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-bg min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex items-center justify-center gap-3 mb-8">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white text-black text-xl" aria-hidden="true">✦</span>
          <span className="text-sm font-semibold uppercase tracking-widest text-zinc-400">MockingBird</span>
        </Link>
        <section className="glass-card p-7 sm:p-8">
          <h1 className="text-2xl font-bold text-white">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="text-sm mt-2 mb-7 text-zinc-500">
            {isRegister ? "Save your sessions and track your interview progress." : "Sign in to continue to your dashboard."}
          </p>
          {authError && <p role="alert" className="rounded-xl px-4 py-3 mb-5 text-sm text-red-200 bg-red-500/10 border border-red-500/20">{authError}</p>}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <>
                <label className="block">
                  <span className="field-label">Full name <span className="normal-case tracking-normal">(optional)</span></span>
                  <input className="input-field" autoComplete="name" maxLength={80}
                    value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
                </label>
                <label className="block">
                  <span className="field-label">Username</span>
                  <input className="input-field" autoComplete="username" required minLength={3} maxLength={30}
                    pattern="[a-zA-Z0-9_]+" value={form.username}
                    onChange={(event) => setForm({ ...form, username: event.target.value })} />
                </label>
              </>
            )}
            <label className="block">
              <span className="field-label">Email</span>
              <input className="input-field" type="email" autoComplete="email" required
                value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="block">
              <span className="field-label">Password</span>
              <input className="input-field" type="password" autoComplete={isRegister ? "new-password" : "current-password"}
                required minLength={isRegister ? 4 : undefined} value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })} />
              {isRegister && <span className="block text-xs mt-2 text-zinc-600">At least 4 characters</span>}
            </label>
            {error && <div role="alert" className="rounded-xl px-4 py-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-6">
            {isRegister ? "Already have an account? " : "New to MockingBird? "}
            <Link className="text-zinc-200 hover:text-white underline underline-offset-4"
              to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
