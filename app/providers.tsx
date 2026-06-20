"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes";
import { Toaster } from "sileo";
import { AuthProvider } from "./AuthContext";
export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <AuthProvider>
      <HeroUIProvider>
        <NextThemesProvider defaultTheme="light" {...themeProps}>
          {children}
          <Toaster position="top-right" theme="light" />
        </NextThemesProvider>
      </HeroUIProvider>
    </AuthProvider>
  );
}
