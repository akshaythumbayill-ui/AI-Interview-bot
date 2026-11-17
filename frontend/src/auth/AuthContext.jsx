import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
    } else {
      getCurrentUser()
        .then(({ data }) => { if (active) setUser(data); })
        .catch((error) => {
          if (error.response?.status === 401) {
            localStorage.removeItem("access_token");
          } else if (active) {
            setAuthError("Could not verify your session. Check that the backend is available.");
          }
          if (active) setUser(null);
        })
        .finally(() => { if (active) setLoading(false); });
    }

    const handleUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    authError,
    signIn(token, authenticatedUser) {
      localStorage.setItem("access_token", token);
      setUser(authenticatedUser);
      setAuthError("");
    },
    signOut() {
      localStorage.removeItem("access_token");
      setUser(null);
      setAuthError("");
    },
  }), [user, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
