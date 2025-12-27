import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "supplier" | "user" | "purchase_team" | "software_team" | null;

interface User {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock auth provider: store user locally without server calls

  const login = async (username: string, _password: string) => {
    setIsLoading(true);
    setError(null);
    // Mock behavior: accept any credentials, create a simple user
    const userObj = { id: Math.random().toString(36).slice(2), username, role: username.includes("supplier") ? ("supplier" as const) : ("user" as const) };
    setUser(userObj);
    const fakeToken = `mock-${userObj.id}`;
    setToken(fakeToken);
    localStorage.setItem("authToken", fakeToken);
    localStorage.setItem("authUser", JSON.stringify(userObj));
    setIsLoading(false);
  };

  const signup = async (username: string, _password: string, role: UserRole) => {
    setIsLoading(true);
    setError(null);
    // Mock signup: create user locally
    const userObj = { id: Math.random().toString(36).slice(2), username, role: role || ("user" as const) };
    setUser(userObj);
    const fakeToken = `mock-${userObj.id}`;
    setToken(fakeToken);
    localStorage.setItem("authToken", fakeToken);
    localStorage.setItem("authUser", JSON.stringify(userObj));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, signup, logout, isLoading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
