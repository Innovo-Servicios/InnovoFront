"use client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Chip,
  Divider,
  CardBody,
  Card,
  CardHeader,
} from "@heroui/react";
import { Calendar, MapPin, FileText, Hash, Clock, Briefcase, AtSign } from "lucide-react";
import AuthenticatedImage from "@/components/common/AuthenticatedImage";
interface Novedad {
  id: string;
  TipoNovedad: string;
  Fotografia: string;
  Lecturacorrecta: number;
  Comentario: string;
  Fecha: string;
  direccion: string;
  emisor?: Emisor;
}
interface Tiponovedad {
  _id: string;
  value: string;
}

interface Emisor {
  _id: string;
  Rut: string;
  nombre: string;
  cargo: string;
  correo: string;
  lastUbicacion: { lat: number; lon: number } | null;
}
interface NovedadDrawerProps {
  novedad: Novedad | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChange: () => void;
  tiponovedad: Tiponovedad[];
}

export default function NovedadDrawer({
  novedad,
  isOpen,
  onClose,
  onOpenChange,
  tiponovedad,
}: NovedadDrawerProps) {
  if (!novedad) return null; 
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="xl"
      placement="bottom"
    >
      <DrawerContent>
        <DrawerHeader className="flex justify-start items-center gap-4">
          <h1 className="text-2xl">Detalles de la Novedad</h1>
          <Chip color="warning" variant="flat" className="mr-4" size="lg">
            {tiponovedad.find((tipo) => tipo._id === novedad.TipoNovedad)
              ?.value || "N/A"}
          </Chip>
        </DrawerHeader>
        <Divider />
        <DrawerBody className="scrollbar-hide flex flex-row gap-4 max-h-[50vh]">
          <Card>
            <CardHeader className="flex flex-row shadow-md justify-start items-center">
              <h2 className="text-xl font-semibold">Novedad </h2><Hash size={24}/>{novedad.id}
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin size={24} />
                  <span>Dirección: {novedad.direccion}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={24} />
                  <span>Fecha: {novedad.Fecha.split("T")[0]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={24} />
                  <span>Hora: {novedad.Fecha.split("T")[1].split(".")[0]}</span>
                </div>

                <div className="flex items-center gap-2">
                  <FileText size={24} />
                  <span>Comentario: {novedad.Comentario}</span>
                </div>
              </div>
            </CardBody>
          </Card>
          {novedad.Fotografia &&
            /\.(jpg|jpeg|png|gif)$/i.test(novedad.Fotografia) && (
              <Card>
                <AuthenticatedImage
                  isZoomed
                  alt="Fotografia"
                  filePath={novedad.Fotografia}
                  className="object-cover w-full max-h-[50vh]"
                  downloadName="Fotografia"
                />
              </Card>
            )}
          {novedad.emisor && (
            <Card>
              <CardHeader className="flex justify-start items-center gap-4 shadow-md">
                <h2 className="text-xl font-semibold">{novedad.emisor.nombre}</h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Hash size={24} />
                    <span>Rut: {novedad.emisor.Rut}</span>
                  </div>
                  {novedad.emisor.lastUbicacion && (
                    <div className="flex items-center gap-2">
                      <MapPin size={24} />
                      <span>
                        Ubicación: {novedad.emisor.lastUbicacion.lat},{" "}
                        {novedad.emisor.lastUbicacion.lon}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Briefcase size={24} />
                    <span>Cargo: {novedad.emisor.cargo}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <AtSign size={24} />
                    <span>Correo: {novedad.emisor.correo}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
