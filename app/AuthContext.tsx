"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { URL } from "@/config/config";
import { io, Socket } from "socket.io-client";
import type { AccessSession } from "@/lib/accessControl";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  socket: Socket | null;
  authReady: boolean;
  accessReady: boolean;
  session: AccessSession | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  reloadAccess: () => Promise<AccessSession | null>;
  refreshSession: () => Promise<string | null>;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [session, setSession] = useState<AccessSession | null>(null);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${URL}/token/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setToken(null);
        setSession(null);
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
  }, []);

  const logout = useCallback(async () => {
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
      setSession(null);
      setAccessReady(true);
      router.push("/");
    }
  }, [router, socket, token]);

  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const buildRequestInit = (accessToken: string | null): RequestInit => {
        const headers = new Headers(init.headers);

        if (accessToken) {
          headers.set("Authorization", `Bearer ${accessToken}`);
        }

        return {
          ...init,
          headers,
          credentials: "include",
        };
      };

      const activeToken = token || (await refreshSession());
      const response = await fetch(input, buildRequestInit(activeToken));

      if (response.status !== 401) {
        return response;
      }

      const refreshedToken = await refreshSession();
      if (!refreshedToken) {
        await logout();
        return response;
      }

      return fetch(input, buildRequestInit(refreshedToken));
    },
    [logout, refreshSession, token]
  );

  const reloadAccess = useCallback(async () => {
    if (!token) {
      setSession(null);
      setAccessReady(true);
      return null;
    }

    setAccessReady(false);
    try {
      const response = await fetch(`${URL}/trabajador/sesion`, {
        method: "GET",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) setToken(null);
        setSession(null);
        return null;
      }
      const nextSession = (await response.json()) as AccessSession;
      setSession(nextSession);
      return nextSession;
    } catch {
      setSession(null);
      return null;
    } finally {
      setAccessReady(true);
    }
  }, [token]);

  const hasPermission = useCallback(
    (permission: string) => session?.permisos.includes(permission) ?? false,
    [session]
  );

  const hasAnyPermission = useCallback(
    (...permissions: string[]) => permissions.some((permission) => hasPermission(permission)),
    [hasPermission]
  );

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
  }, [refreshSession]);

  useEffect(() => {
    reloadAccess();
  }, [reloadAccess]);

  useEffect(() => {
    if (!token) {
      setSocket((currentSocket) => {
        currentSocket?.close();
        return null;
      });
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
        setToken(null);
        setSession(null);
        router.push("/");
      }
    });

    ws.on("control-acceso-actualizado", () => {
      reloadAccess().finally(() => {
        ws.disconnect();
        ws.connect();
      });
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [refreshSession, reloadAccess, router, token]);

  return (
    <AuthContext.Provider value={{ token, setToken, socket, authReady, accessReady, session, hasPermission, hasAnyPermission, reloadAccess, refreshSession, authenticatedFetch, logout }}>
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
