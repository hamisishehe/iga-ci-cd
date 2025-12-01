"use client";

import React, { createContext, ReactNode, useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";

interface AuthData {
  token: string;
  role: string;
  email: string;
  username: string;
  centre: string;
  userType: string;
  zone: string;
  userId:string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  role: string | undefined;
  loading: boolean;
  login: (token: string, role: string, email: string, username: string, centre: string, userType: string, zone:string, id:string) => void;
  logout: () => void;
  user?: AuthData;
  
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<AuthData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedRole = localStorage.getItem("userRole");
    const storedIsAuth = localStorage.getItem("isAuthenticated");

    if (storedToken && storedRole && storedIsAuth === "true") {
      const storedUser: AuthData = {
        token: storedToken,
        role: storedRole,
        email: localStorage.getItem("email") || "",
        username: localStorage.getItem("username") || "",
        centre: localStorage.getItem("centre") || "",
        userType: localStorage.getItem("userType") || "",
        zone: localStorage.getItem("zone") || "",
        userId: localStorage.getItem("userId") || "",
      };
      setToken(storedToken);
      setRole(storedRole);
      setUser(storedUser);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setUser(undefined);
    }

    setLoading(false);
  }, []);

  const login = (token: string, role:string, email:string, username:string, centre:string, userType:string, zone:string, userid:string) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userRole", role);
    localStorage.setItem("email", email);
    localStorage.setItem("username", username);
    localStorage.setItem("centre", centre);
    localStorage.setItem("userType", userType);
    localStorage.setItem("zone", zone);
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userId", userid);

    setToken(token);
    setRole(role);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("email");
    localStorage.removeItem("username");
    localStorage.removeItem("centre");
    localStorage.removeItem("userType");
    localStorage.removeItem("zone");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userId");

    setToken(null);
    setRole(undefined);
    setUser(undefined);
    setIsAuthenticated(false);

    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, role, loading, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
