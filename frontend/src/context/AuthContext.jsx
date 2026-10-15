import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSession, getToken, setSession } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ears_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [ambulance, setAmbulance] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api("/auth/me")
      .then((data) => {
        setUser(data.user);
        setAmbulance(data.ambulance || null);
        setSession(token, data.user);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    setSession(data.token, data.user);
    setUser(data.user);
    const me = await api("/auth/me");
    setAmbulance(me.ambulance || null);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api("/auth/register", { method: "POST", body: payload });
    setSession(data.token, data.user);
    setUser(data.user);
    const me = await api("/auth/me");
    setAmbulance(me.ambulance || null);
    return data.user;
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setAmbulance(null);
  };

  const value = useMemo(
    () => ({ user, ambulance, setAmbulance, loading, login, register, logout }),
    [user, ambulance, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
