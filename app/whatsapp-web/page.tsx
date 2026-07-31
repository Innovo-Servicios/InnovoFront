"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageSquare,
  Power,
  RefreshCw,
  RotateCcw,
  Send,
  Smartphone,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { URL } from "@/config/config";

const TOKEN_STORAGE_KEY = "gpi.whatsappPanelToken";
const STATUS_REFRESH_MS = 5000;

type WhatsAppAccount = {
  pushname: string | null;
  wid: string | null;
  platform: string | null;
};

type WhatsAppPanelStatus = {
  enabled: boolean;
  ready: boolean;
  initializing: boolean;
  hasClient: boolean;
  authPath: string | null;
  recipientChatId: string | null;
  account: WhatsAppAccount | null;
  lastError: string | null;
  latestQrAt: string | null;
  authenticatedAt: string | null;
  readyAt: string | null;
  disconnectedAt: string | null;
  headless: boolean;
  qr: {
    imageDataUrl: string;
    updatedAt: string | null;
  } | null;
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

type NoticeKind = "success" | "warning" | "danger" | "neutral";

type Notice = {
  kind: NoticeKind;
  text: string;
};

const buildApiUrl = (path: string) => `${URL}${path}`;

const formatValue = (value: string | null | undefined) => {
  const trimmed = String(value || "").trim();
  return trimmed || "-";
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
};

const getStatusLabel = (status: WhatsAppPanelStatus | null) => {
  if (!status) return { text: "Sin estado", className: "bg-slate-100 text-slate-600", icon: Smartphone };
  if (!status.enabled) return { text: "Deshabilitado", className: "bg-red-50 text-red-700", icon: XCircle };
  if (status.ready) return { text: "Listo", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 };
  if (status.initializing) return { text: "Inicializando", className: "bg-amber-50 text-amber-700", icon: Loader2 };
  if (status.qr) return { text: "QR pendiente", className: "bg-amber-50 text-amber-700", icon: Smartphone };
  if (status.lastError) return { text: "Error", className: "bg-red-50 text-red-700", icon: XCircle };
  return { text: "Sin iniciar", className: "bg-slate-100 text-slate-700", icon: Smartphone };
};

const noticeClassName = (kind: NoticeKind) => {
  const variants: Record<NoticeKind, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return variants[kind];
};

export default function WhatsAppWebPanelPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [panelToken, setPanelToken] = useState("");
  const [status, setStatus] = useState<WhatsAppPanelStatus | null>(null);
  const [statusNotice, setStatusNotice] = useState<Notice | null>(null);
  const [sendNotice, setSendNotice] = useState<Notice | null>(null);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<"status" | "initialize" | "restart" | "send" | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    setPanelToken(storedToken);
    setTokenInput(storedToken);
  }, []);

  const requestJson = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!panelToken) {
        throw new Error("Token requerido");
      }

      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${panelToken}`);
      if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(buildApiUrl(path), {
        ...init,
        headers,
      });

      const responseText = await response.text();
      let payload: ApiErrorPayload | T | null = null;

      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = { message: responseText };
        }
      }

      if (!response.ok) {
        const errorPayload = payload as ApiErrorPayload | null;
        const apiMessage = errorPayload?.error || errorPayload?.message || `HTTP ${response.status}`;
        throw new Error(apiMessage);
      }

      return payload as T;
    },
    [panelToken]
  );

  const refreshStatus = useCallback(async () => {
    if (!panelToken) return;

    setLoadingAction((current) => current || "status");

    try {
      const nextStatus = await requestJson<WhatsAppPanelStatus>("/whatsapp-web/api/status");
      setStatus(nextStatus);
      setStatusNotice(null);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "No se pudo consultar WhatsApp";
      setStatusNotice({ kind: "danger", text: messageText });
    } finally {
      setLoadingAction((current) => (current === "status" ? null : current));
    }
  }, [panelToken, requestJson]);

  useEffect(() => {
    if (!panelToken) return;

    refreshStatus();
    const intervalId = window.setInterval(() => {
      refreshStatus();
    }, STATUS_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [panelToken, refreshStatus]);

  const saveToken = () => {
    const nextToken = tokenInput.trim();
    if (!nextToken) {
      setStatusNotice({ kind: "warning", text: "Ingresa un token para consultar la sesión." });
      return;
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setPanelToken(nextToken);
    setStatusNotice(null);
    setSendNotice(null);
  };

  const clearToken = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setPanelToken("");
    setTokenInput("");
    setStatus(null);
    setStatusNotice(null);
    setSendNotice(null);
  };

  const runStatusAction = async (action: "initialize" | "restart") => {
    setLoadingAction(action);
    setStatusNotice(null);

    try {
      const path = action === "initialize" ? "/whatsapp-web/api/initialize" : "/whatsapp-web/api/restart";
      const nextStatus = await requestJson<WhatsAppPanelStatus>(path, { method: "POST" });
      setStatus(nextStatus);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "No se pudo actualizar la sesión";
      setStatusNotice({ kind: "danger", text: messageText });
    } finally {
      setLoadingAction(null);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSendNotice(null);

    const safeRecipient = recipient.trim();
    const safeMessage = message.trim();

    if (!safeRecipient || !safeMessage || !panelToken) {
      setSendNotice({ kind: "warning", text: "Completa token, destinatario y mensaje." });
      return;
    }

    setLoadingAction("send");

    try {
      const result = await requestJson<{ chatId?: string; message?: string }>("/whatsapp-web/api/send", {
        method: "POST",
        body: JSON.stringify({ recipient: safeRecipient, message: safeMessage }),
      });

      setMessage("");
      setSendNotice({ kind: "success", text: `Mensaje enviado a ${result.chatId || safeRecipient}` });
      refreshStatus();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
      setSendNotice({ kind: "danger", text: messageText });
    } finally {
      setLoadingAction(null);
    }
  };

  const accountSummary = useMemo(() => {
    if (!status?.account) return "-";
    return [status.account.pushname, status.account.wid, status.account.platform].filter(Boolean).join(" / ") || "-";
  }, [status]);

  const statusLabel = getStatusLabel(status);
  const StatusIcon = statusLabel.icon;
  const isBusy = Boolean(loadingAction);
  const canSend = Boolean(panelToken && recipient.trim() && message.trim() && loadingAction !== "send");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4">
        <header className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950">WhatsApp Web</h1>
            <p className="mt-1 text-sm text-slate-500">Panel operativo de la sesión local del backend GPI</p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${statusLabel.className}`}>
            <StatusIcon className={loadingAction === "status" ? "animate-spin" : ""} size={18} />
            {statusLabel.text}
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              Token del panel
              <input
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveToken();
                }}
                autoComplete="current-password"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={saveToken}
              >
                <KeyRound size={18} />
                Conectar
              </button>
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={clearToken}
                disabled={!panelToken && !tokenInput}
              >
                <XCircle size={18} />
                Olvidar token
              </button>
            </div>
          </div>
          {statusNotice && (
            <div className={`mt-3 rounded-md border px-3 py-2 text-sm font-medium ${noticeClassName(statusNotice.kind)}`}>
              {statusNotice.text}
            </div>
          )}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
              <h2 className="text-base font-bold tracking-normal">Estado</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={refreshStatus}
                  disabled={!panelToken || isBusy}
                >
                  <RefreshCw className={loadingAction === "status" ? "animate-spin" : ""} size={17} />
                  Actualizar
                </button>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => runStatusAction("initialize")}
                  disabled={!panelToken || isBusy}
                >
                  <Power size={17} />
                  Iniciar
                </button>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-amber-600 px-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => runStatusAction("restart")}
                  disabled={!panelToken || isBusy}
                >
                  <RotateCcw size={17} />
                  Reiniciar
                </button>
              </div>
            </div>
            <dl className="grid gap-0 p-4 text-sm">
              {[
                ["Cuenta", accountSummary],
                ["Destino ATE", formatValue(status?.recipientChatId)],
                ["Auth local", formatValue(status?.authPath)],
                ["Último QR", formatDateTime(status?.latestQrAt || status?.qr?.updatedAt)],
                ["Autenticado", formatDateTime(status?.authenticatedAt)],
                ["Último listo", formatDateTime(status?.readyAt)],
                ["Desconectado", formatDateTime(status?.disconnectedAt)],
                ["Último error", formatValue(status?.lastError)],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
                  <dt className="font-bold text-slate-500">{label}</dt>
                  <dd className="min-w-0 break-words text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <h2 className="text-base font-bold tracking-normal">QR</h2>
              <span className="text-xs font-semibold text-slate-500">{formatDateTime(status?.qr?.updatedAt)}</span>
            </div>
            <div className="grid min-h-[320px] place-items-center p-5">
              {status?.qr?.imageDataUrl ? (
                <Image
                  className="h-auto w-full max-w-[280px] rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                  src={status.qr.imageDataUrl}
                  alt="QR de WhatsApp Web"
                  width={280}
                  height={280}
                  unoptimized
                />
              ) : (
                <div className="grid place-items-center gap-3 text-center text-slate-500">
                  <Smartphone size={42} />
                  <p className="text-sm font-semibold">No hay QR pendiente.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4">
              <MessageSquare size={18} />
              <h2 className="text-base font-bold tracking-normal">Mensaje</h2>
            </div>
            <form className="grid gap-4 p-4" onSubmit={sendMessage}>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Número o chat ID
                <input
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="+56 9 1234 5678"
                  inputMode="tel"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Texto
                <textarea
                  className="min-h-36 resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={4096}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={!canSend}
                >
                  {loadingAction === "send" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Enviar
                </button>
                <span className="text-xs font-medium text-slate-500">{message.length}/4096</span>
              </div>
              {sendNotice && (
                <div className={`rounded-md border px-3 py-2 text-sm font-medium ${noticeClassName(sendNotice.kind)}`}>
                  {sendNotice.text}
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
