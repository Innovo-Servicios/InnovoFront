"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { URL } from "@/config/config";
import { io, Socket } from "socket.io-client";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  socket: Socket | null;
  authReady: boolean;
  refreshSession: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  const refreshSession = async () => {
    try {
      const response = await fetch(`${URL}/token/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setToken(null);
        return null;
      }

      const data = await response.json();
      const nextToken = typeof data.token === "string" ? data.token : null;
      setToken(nextToken);
      return nextToken;
    } catch (error) {
      setToken(null);
      return null;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${URL}/token/logout`, {
        method: "POST",
        credentials: "include",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    } finally {
      if (socket) {
        socket.close();
      }
      setSocket(null);
      setToken(null);
      router.push("/");
    }
  };

  useEffect(() => {
    let active = true;

    refreshSession().finally(() => {
      if (active) {
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    const ws = io(URL, {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    ws.on("connect", () => {
      console.log("WebSocket conectado");
    });

    ws.on("disconnect", () => {
      console.log("WebSocket desconectado");
    });

    ws.on("connect_error", async () => {
      const refreshedToken = await refreshSession();
      if (!refreshedToken) {
        await logout();
      }
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, setToken, socket, authReady, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
