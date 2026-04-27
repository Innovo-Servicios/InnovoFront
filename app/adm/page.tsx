"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import {
  Users,
  Map,
  BarChart2,
  CloudUpload,
  FileUp,
  BellPlus,
  MessageSquare,
  Pin,
  Bot,
  BotOff,
} from "lucide-react";
import { Progress } from "@heroui/progress";
import { Button } from "@heroui/react";
import { useAuth } from "../AuthContext";
import { uploadAsignacion } from "@/api/adm/api";
import Link from "next/link";
export default function Admin() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const { socket } = useAuth();
  useEffect(() => {
    if (socket) {
      // Escuchar el evento "estadoActualizado" del backend
      socket.on("estadoActualizado", (estado: boolean) => {
        setIsActive(estado);
      });

      // Solicitar el estado del bot al conectar
      socket.emit("estadoBot");

      // Limpieza al desmontar el componente
      return () => {
        socket.off("estadoActualizado");
      };
    }
  }, [socket]);
  const toggleBot = () => {
    setIsActive(!isActive);
    if (socket) {
      socket.emit("actualizarEstadoBot", !isActive);
    }
  };
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  return (
    <div
      className="p-6 space-y-6 bg-gradient-to-br from-sky-50 via-blue-50 to-blue-100 overflow-x-hidden"
      style={{ width: "100%", minHeight: "100vh" }}
    >
      <div className="flex flex-row items-center justify-between content-center mb-8">
        <h1 className="text-4xl font-bold text-black">
          Panel de administración
        </h1>
        <div className="flex items-center space-x-6 bg-white px-6 py-4 rounded-md shadow-md">
          {isActive ? (
            <Bot color={"black"} size={42} aria-label="Asistente Bot Activo" />
          ) : (
            <BotOff
              className="text-muted-foreground"
              size={42}
              aria-label="Asistente Bot Inactivo"
            />
          )}
          <Button
            size="md"
            color={isActive ? "success" : "default"}
            variant="flat"
            onPress={toggleBot}
          >
            {isActive ? "Activo" : "Inactivo"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="col-span-full lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardFooter className="text-xl font-bold">
              Estadísticas generales
            </CardFooter>
            <BarChart2
              className="h-5 w-5 text-primary"
              aria-label="Estadísticas generales"
            />
          </CardHeader>
          <CardBody>
            <div className="h-[200px] w-full bg-gradient-to-r from-primary to-primary-foreground rounded-md flex items-end justify-around p-4">
              <div className="h-3/4 w-12 bg-background/90 rounded-t-md"></div>
              <div className="h-1/2 w-12 bg-background/70 rounded-t-md"></div>
              <div className="h-full w-12 bg-background rounded-t-md"></div>
              <div className="h-2/3 w-12 bg-background/80 rounded-t-md"></div>
              <div className="h-1/3 w-12 bg-background/60 rounded-t-md"></div>
            </div>
          </CardBody>
        </Card>
        <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-primary/5">
            <CardFooter className="text-md font-medium">
              Subir asignaciones
            </CardFooter>
            <CloudUpload
              className="text-primary group-hover:text-secondary transition-colors duration-300"
              size={32}
            />
          </CardHeader>
          <CardBody
            className={`pt-4 cursor-pointer z-20${
              dragging ? "border-secondary bg-secondary/10" : "border-primary"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              id="file-input"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="file-input"
              className="flex flex-col items-center justify-center h-40 text-center text-sm text-muted-foreground cursor-pointer"
            >
              {file ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <p className="text-primary font-medium">{file.name}</p>
                  <Button
                    size="lg"
                    variant="flat"
                    color="primary"
                    onPress={() => token && uploadAsignacion(file, token)}
                  >
                    Subir
                  </Button>
                </div>
              ) : dragging ? (
                <>
                  <FileUp size={48} className="mb-4 text-secondary" />
                  <p>Suelta el archivo aquí</p>
                </>
              ) : (
                <>
                  <FileUp size={48} className="mb-4 text-primary" />
                  <p>Arrastra y suelta un archivo aquí</p>
                  <p>o haz clic para seleccionarlo</p>
                </>
              )}
            </label>
          </CardBody>
        </Card>
        <Link href="/adm/workers">
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-secondary/10 to-secondary/5">
              <CardFooter className="text-lg font-medium">
                Ver trabajadores
              </CardFooter>
              <Users
                className="text-secondary group-hover:text-primary transition-colors duration-300"
                aria-label="Ver trabajadores"
                size={32}
              />
            </CardHeader>
            <CardBody className="pt-4">
              <p className="text-md text-muted-foreground text-center">
                Visualiza y gestiona la información de los empleados
              </p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/adm/notification">
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-accent/10 to-accent/5">
              <CardFooter className="text-lg font-medium">
                Generar notificaciones
              </CardFooter>
              <BellPlus
                className="text-accent group-hover:text-secondary transition-colors duration-300"
                aria-label="Documentos de trabajadores"
                size={32}
              />
            </CardHeader>
            <CardBody className="pt-4">
              <p className="text-md text-muted-foreground text-center">
                Administra y envía notificaciones a los trabajadores
              </p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/adm/novedades">
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-destructive/10 to-destructive/5">
              <CardFooter className="text-lg font-medium">
                Administrar novedades
              </CardFooter>
              <MessageSquare
                className="text-destructive group-hover:text-accent transition-colors duration-300"
                aria-label="Administrar novedades"
                size={32}
              />
            </CardHeader>
            <CardBody className="pt-4">
              <p className="text-md text-muted-foreground text-center">
                Gestiona las últimas noticias y actualizaciones
              </p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/adm/rutas">
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardFooter className="text-lg font-medium">Ver Rutas</CardFooter>
              <Map
                className="text-primary group-hover:text-destructive transition-colors duration-300"
                aria-label="Ver rutas"
                size={32}
              />
            </CardHeader>
            <CardBody className="pt-4">
              <p className="text-md text-muted-foreground text-center">
                Visualiza y planifica las rutas de la empresa
              </p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/adm/followup">
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardFooter className="text-lg font-medium">
                Seguimiento
              </CardFooter>
              <Pin
                className="text-primary group-hover:text-destructive transition-colors duration-300"
                aria-label="Ver rutas"
                size={32}
              />
            </CardHeader>
            <CardBody className="pt-4">
              <p className="text-md text-muted-foreground text-center">
                Visualiza trabajadores en terreno
              </p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/adm/direcciones">
          <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardFooter className="text-lg font-medium">
                Modificar direcciones
              </CardFooter>
              <Map
                className="text-primary group-hover:text-destructive transition-colors duration-300"
                aria-label="Ver rutas"
                size={32}
              />
            </CardHeader>
            <CardBody className="pt-4">
              <p className="text-md text-muted-foreground text-center">
                Visualiza y modificar las direcciones de los sectores
              </p>
            </CardBody>
          </Card>
        </Link>{/** 
        <Card className="col-span-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardFooter className="text-xl font-bold">
              Progreso general
            </CardFooter>
          </CardHeader>
          <CardBody>
            <Progress
              value={66}
              className="h-2 w-full"
              aria-label="Progreso general"
            />
            <p className="text-sm text-muted-foreground mt-2">
              66% de los objetivos mensuales completados
            </p>
          </CardBody>
        </Card>*/}
      </div>
    </div>
  );
}
