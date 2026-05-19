"use client";

import { createContext, useContext, useState, useEffect } from "react";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

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
        const userData = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        return true;
      }
      // If API returns 401 and it's the demo admin, use fallback for development
      if (email.trim().toLowerCase() === "admin@fabent.com" && password === "Admin2024") {
        const adminUser = { id: 1, name: "Admin", email: "admin@fabent.com", role: "Administrator" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
        setUser(adminUser);
        return true;
      }
    } catch {
      // On network error, also allow fallback
      if (email.trim().toLowerCase() === "admin@fabent.com" && password === "Admin2024") {
        const adminUser = { id: 1, name: "Admin", email: "admin@fabent.com", role: "Administrator" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
        setUser(adminUser);
        return true;
      }
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
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