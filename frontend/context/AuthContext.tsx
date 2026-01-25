"use client";

import React, {
  createContext,
  ReactNode,
  useEffect,
  useState,
  useContext,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

/* ================= CONSTANT ================= */
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

/* ================= TYPES ================= */
interface AuthData {
  token: string;
  role: string;
  email: string;
  username: string;
  centre: string;
  userType: string;
  zone: string;
  userId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  role: string | undefined;
  loading: boolean;
  login: (
    token: string,
    role: string,
    email: string,
    username: string,
    centre: string,
    userType: string,
    zone: string,
    id: string
  ) => void;
  logout: () => void;
  user?: AuthData;
}

/* ================= CONTEXT ================= */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ================= PROVIDER ================= */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<AuthData | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  /* ================= RESET INACTIVITY TIMER ================= */
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    inactivityTimer.current = setTimeout(() => {
      logout();
    }, INACTIVITY_LIMIT);
  };

  /* ================= LOAD SESSION FROM STORAGE ================= */
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
      resetInactivityTimer();
    }

    setLoading(false);
  }, []);

  /* ================= TRACK USER ACTIVITY ================= */
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = [
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
    ];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event =>
      window.addEventListener(event, handleActivity)
    );

    return () => {
      events.forEach(event =>
        window.removeEventListener(event, handleActivity)
      );

      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [isAuthenticated]);

  /* ================= LOGIN ================= */
  const login = (
    token: string,
    role: string,
    email: string,
    username: string,
    centre: string,
    userType: string,
    zone: string,
    userid: string
  ) => {
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
    setUser({
      token,
      role,
      email,
      username,
      centre,
      userType,
      zone,
      userId: userid,
    });
    setIsAuthenticated(true);

    resetInactivityTimer();
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

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
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        role,
        loading,
        login,
        logout,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ================= HOOK ================= */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
