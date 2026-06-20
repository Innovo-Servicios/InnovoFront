"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader, Input } from "@heroui/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { sileo } from "sileo";

interface MiniProps {
  initialUrl: string;
}

export function Mini({ initialUrl }: MiniProps) {
  const [url, setUrl] = useState(initialUrl);
  const [cookies, setCookies] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = (newUrl: string) => {
    try {
      const validatedUrl = new URL(newUrl);
      setUrl(validatedUrl.href);
      if (iframeRef.current) {
        iframeRef.current.src = validatedUrl.href;
      }
    } catch {
      sileo.warning({
        title: "URL inválida",
        description: "Ingresa una dirección completa, por ejemplo https://sitio.cl.",
      });
    }
  };

  const goBack = () => iframeRef.current?.contentWindow?.history.back();
  const goForward = () => iframeRef.current?.contentWindow?.history.forward();

  // Escuchar mensajes desde el iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Filtra mensajes que no sean relevantes
      if (event.origin !== new URL(initialUrl).origin) return;

      // Procesa el mensaje
      if (event.data.type === "COOKIES") {
        setCookies(event.data.cookies); // Guarda las cookies en el estado
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [initialUrl]);

  return (
    <Card>
      <CardBody className="sm:max-w-[80vw] sm:h-[80vh] p-0">
        <CardHeader className="p-4">
          <h1>Mini Navegador</h1>
        </CardHeader>
        <div className="flex items-center space-x-2 px-4 py-2 border-t border-b">
          <Button onPress={goBack}>
            <ArrowLeft />
          </Button>
          <Button onPress={goForward}>
            <ArrowRight />
          </Button>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && navigate(url)}
            className="flex-grow"
          />
        </div>
        <iframe
          ref={iframeRef}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="w-full h-[calc(100%-110px)]"
          title="Mini Browser"
        />
        <div className="p-4 border-t">
          <p className="text-sm">Cookies: {cookies}</p>
        </div>
      </CardBody>
    </Card>
  );
}
