"use client";

import type { ComponentProps } from "react";
import { Image } from "@heroui/react";
import { useAuth } from "@/app/AuthContext";
import {
  downloadAuthenticatedFile,
  useAuthenticatedObjectUrl,
} from "@/lib/authenticatedFiles";

type AuthenticatedImageProps = Omit<ComponentProps<typeof Image>, "src"> & {
  filePath?: string | null;
  downloadName?: string;
};

export default function AuthenticatedImage({
  filePath,
  downloadName,
  onClick,
  ...props
}: AuthenticatedImageProps) {
  const { authenticatedFetch } = useAuth();
  const objectUrl = useAuthenticatedObjectUrl(filePath, authenticatedFetch);

  if (!objectUrl) {
    return null;
  }

  return (
    <Image
      {...props}
      src={objectUrl}
      onClick={(event) => {
        onClick?.(event);
        if (!downloadName) return;
        downloadAuthenticatedFile(authenticatedFetch, filePath, downloadName).catch(
          (error) => console.error("Error al descargar el archivo:", error)
        );
      }}
    />
  );
}
