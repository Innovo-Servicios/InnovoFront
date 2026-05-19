"use client";

import { useEffect, useState } from "react";
import { URL as API_URL } from "@/config/config";

type AuthenticatedFetch = (
  input: RequestInfo | globalThis.URL,
  init?: RequestInit
) => Promise<Response>;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getFileNameFromDisposition = (header: string | null) => {
  if (!header) return null;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
  }

  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1]?.trim() || null;
};

const getLegacyAssetPath = (rawPath: string) => {
  const legacyMatch = rawPath.match(
    /\/IMG_(ATES|NOVEDADES|PERFILES|VERIFICACIONES)\/([^?#]+)/i
  );
  if (!legacyMatch) return null;

  const typeMap: Record<string, string> = {
    ATES: "ate",
    NOVEDADES: "novedades",
    PERFILES: "perfiles",
    VERIFICACIONES: "verificaciones",
  };

  const type = typeMap[legacyMatch[1].toUpperCase()];
  const fileName = legacyMatch[2].split(/[\\/]/).filter(Boolean).pop();
  return type && fileName ? `/assets/${type}/${encodeURIComponent(fileName)}` : null;
};

export const buildApiFileUrl = (filePath?: string | null) => {
  const rawPath = String(filePath || "").trim();
  if (!rawPath) return null;

  const legacyAssetPath = getLegacyAssetPath(rawPath);
  const normalizedPath = legacyAssetPath || rawPath;

  try {
    const apiBase = new globalThis.URL(trimTrailingSlash(API_URL));
    const parsedUrl = new globalThis.URL(normalizedPath, `${apiBase.origin}/`);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    if (parsedUrl.origin !== apiBase.origin) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const downloadAuthenticatedFile = async (
  authenticatedFetch: AuthenticatedFetch,
  filePath?: string | null,
  fallbackName = "archivo"
) => {
  const fileUrl = buildApiFileUrl(filePath);
  if (!fileUrl) {
    throw new Error("Ruta de archivo inválida");
  }

  const response = await authenticatedFetch(fileUrl, { method: "GET" });
  if (!response.ok) {
    throw new Error("No se pudo descargar el archivo");
  }

  const blob = await response.blob();
  const objectUrl = globalThis.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = getFileNameFromDisposition(response.headers.get("content-disposition")) || fallbackName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  globalThis.URL.revokeObjectURL(objectUrl);
};

export const useAuthenticatedObjectUrl = (
  filePath: string | null | undefined,
  authenticatedFetch: AuthenticatedFetch
) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let nextObjectUrl: string | null = null;
    const fileUrl = buildApiFileUrl(filePath);

    if (!fileUrl) {
      setObjectUrl(null);
      return () => {};
    }

    authenticatedFetch(fileUrl, { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el archivo");
        }
        return response.blob();
      })
      .then((blob) => {
        nextObjectUrl = globalThis.URL.createObjectURL(blob);
        if (active) {
          setObjectUrl(nextObjectUrl);
        } else {
          globalThis.URL.revokeObjectURL(nextObjectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setObjectUrl(null);
        }
      });

    return () => {
      active = false;
      if (nextObjectUrl) {
        globalThis.URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [authenticatedFetch, filePath]);

  return objectUrl;
};
