"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchUsers: () => Promise<void>;
  createUser: (data: { name: string; email: string; password: string; role?: string }) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  users: [],
  isLoading: true,
  login: async () => false,
  logout: () => {},
  fetchUsers: async () => {},
  createUser: async () => {},
  deleteUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const STORAGE_KEY = "fab_auth_v1";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, confirm the session server-side (the access token lives in an
  // httpOnly cookie that JS can't read). If the short-lived access token has
  // expired, silently rotate it via the refresh cookie and re-render SSR.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let resolved: User | null = null;
      try {
        const me = await fetch(`${API}/auth/me`);
        if (me.ok) {
          resolved = await me.json();
        } else if (me.status === 401) {
          const r = await fetch(`${API}/auth/refresh`, { method: "POST" });
          if (r.ok) {
            resolved = await r.json();
            router.refresh(); // re-run admin SSR with the fresh access cookie
          }
        }
      } catch {
        // network error — treat as logged out
      }
      if (cancelled) return;
      setUser(resolved);
      if (resolved) localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
      else localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
    })();

    // Keep the 15-minute access token fresh while the console stays open.
    const id = setInterval(() => {
      fetch(`${API}/auth/refresh`, { method: "POST" }).catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  async function fetchUsers() {
    try {
      const res = await fetch(`${API}/users/`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      // ignore
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Backend set httpOnly access/refresh cookies; body is the user profile.
        const userData = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        router.refresh(); // render admin SSR now that the cookie is present
        return true;
      }
    } catch {
      // network error — fall through to failure
    }
    return false;
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST" });
    } catch {
      // ignore — clear locally regardless
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.refresh();
  }

  async function createUser(data: { name: string; email: string; password: string; role?: string }) {
    const res = await fetch(`${API}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail ?? "Failed to create user");
    }
    await fetchUsers();
  }

  async function deleteUser(id: number) {
    const res = await fetch(`${API}/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Failed to delete user");
    }
    await fetchUsers();
  }

  return (
    <AuthContext.Provider value={{ user, users, isLoading, login, logout, fetchUsers, createUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}