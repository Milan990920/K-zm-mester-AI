"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CurrentUser, fetchCurrentUser, login as apiLogin } from "@/lib/api";

const ACCESS_TOKEN_KEY = "kozmu_mester_access_token";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    fetchCurrentUser(storedToken)
      .then((currentUser) => {
        setUser(currentUser);
        setAccessToken(storedToken);
      })
      .catch(() => window.localStorage.removeItem(ACCESS_TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiLogin(email, password);
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    const currentUser = await fetchCurrentUser(tokens.access_token);
    setUser(currentUser);
    setAccessToken(tokens.access_token);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
