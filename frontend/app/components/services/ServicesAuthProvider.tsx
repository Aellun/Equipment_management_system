"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authApi, clearToken, getToken, setToken, type SvcUser } from "./client";

interface SvcAuthCtx {
  user: SvcUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SvcUser>;
  register: (payload: Record<string, unknown>) => Promise<SvcUser>;
  logout: () => void;
}

const Ctx = createContext<SvcAuthCtx>({
  user: null,
  loading: true,
  login: async () => ({} as SvcUser),
  register: async () => ({} as SvcUser),
  logout: () => {},
});

export function useServicesAuth() {
  return useContext(Ctx);
}

export default function ServicesAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SvcUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: Record<string, unknown>) => {
    const data = await authApi.register(payload);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
