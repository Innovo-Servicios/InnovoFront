"use client";
import React, { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
  Pagination,
  useDisclosure,
} from "@heroui/react";
import { Calendar, MapPin } from "lucide-react";
import NovedadDrawer from "./NovedadDrawer";

interface Emisor {
  _id: string;
  Rut: string;
  nombre: string;
  cargo: string;
  correo: string;
  lastUbicacion: { lat: number; lon: number } | null;
}

interface Novedad {
  id: string;
  TipoNovedad: string;
  Fotografia: string | string[] | null;
  Lecturacorrecta?: number | null;
  lecturaCaldera?: number | null;
  lecturaCorrector?: number | null;
  Comentario?: string | null;
  Fecha: string;
  direccion: string;
  emisor?: Emisor;
}

interface Tiponovedad {
  _id: string;
  value: string;
}

interface NewsTabProps {
  novedades: Novedad[];
  tiponovedad: Tiponovedad[];
  selectedKeys: Set<string>;
}

const NewsTab: React.FC<NewsTabProps> = ({
  novedades,
  tiponovedad,
  selectedKeys,
}) => {
  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 13;

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [selectedNovedad, setSelectedNovedad] = React.useState<Novedad | null>(
    null
  );

  // Filtrar novedades según las keys seleccionadas
  const novedadesFiltradas = React.useMemo(() => {
    return novedades.filter(
      (novedad) =>
        selectedKeys.has("all") || selectedKeys.has(novedad.TipoNovedad)
    );
  }, [novedades, selectedKeys]);

  // Obtener datos paginados
  const paginatedNovedades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return novedadesFiltradas.slice(startIndex, endIndex);
  }, [novedadesFiltradas, currentPage, itemsPerPage]);

  // Formatear fecha
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatReadingValue = (value?: number | null) =>
    value === null || value === undefined ? "N/A" : value.toString();

  const renderReading = (novedad: Novedad) => {
    const hasCalderaCorrectorReading =
      (novedad.lecturaCaldera !== null && novedad.lecturaCaldera !== undefined) ||
      (novedad.lecturaCorrector !== null && novedad.lecturaCorrector !== undefined);

    if (hasCalderaCorrectorReading) {
      return (
        <div className="flex flex-col items-center gap-1 text-xs leading-tight">
          <span>Caldera: {formatReadingValue(novedad.lecturaCaldera)}</span>
          <span>Corrector: {formatReadingValue(novedad.lecturaCorrector)}</span>
        </div>
      );
    }

    return formatReadingValue(novedad.Lecturacorrecta);
  };

  // Mostrar spinner si no hay datos aún
  if (novedades.length === 0 && tiponovedad.length === 0) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Spinner size="md" />
        Loading...
      </div>
    );
  }

  // Manejo del Drawer
  const handleDrawer = (key: string) => {
    if (key === undefined) return;
    setSelectedNovedad(
      novedades.find((novedad) => novedad.id === key.toString().split("-")[0]) ||
        null
    );
    onOpen();
  };

  return (
  <div className="flex h-full min-h-0 w-full flex-col">
      <NovedadDrawer
        novedad={selectedNovedad}
        isOpen={isOpen}
        onClose={onClose}
        onOpenChange={onOpenChange}
        tiponovedad={tiponovedad}
      />

      {/* Tabla de novedades */}
      <Table
        aria-label="Tabla de novedades"
        isStriped
        classNames={{
          table: "min-h-[100px] min-w-[900px]",
          wrapper: "w-full h-full overflow-auto shadow-none rounded-lg p-0",
          th: "bg-gradient-to-r from-blue-100 via-purple-200 to-blue-100 text-slate-800 font-bold text-sm text-center border-r-2 border-white last:border-r-0",
          td: "text-sm text-center",
        }}
        color="primary"
        selectionMode="single"
        onSelectionChange={(keys) =>
          handleDrawer(Array.from(keys as Set<string>)[0])
        }
      >
        <TableHeader>
          <TableColumn>TIPO</TableColumn>
          <TableColumn>COMENTARIO</TableColumn>
          <TableColumn>LECTURA</TableColumn>
          <TableColumn>FECHA</TableColumn>
          <TableColumn>DIRECCIÓN</TableColumn>
        </TableHeader>
        <TableBody>
          {paginatedNovedades.map((novedad) => (
            <TableRow key={`${novedad.id}-${novedad.Fecha}`}>
              <TableCell>
                <Chip color="warning" variant="flat">
                  {
                    tiponovedad.find(
                      (tipo) => tipo._id === novedad.TipoNovedad
                    )?.value || "N/A"
                  }
                </Chip>
              </TableCell>
              <TableCell>{novedad.Comentario && novedad.Comentario.length > 80 ? `${novedad.Comentario.slice(0, 80)}...` : novedad.Comentario || "N/A"}</TableCell>
              <TableCell>{renderReading(novedad)}</TableCell>
              <TableCell>
                <div className="flex items-center text-center justify-center gap-2">
                  <Calendar size={16} />
                  {formatDate(new Date(novedad.Fecha))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-center justify-center gap-2">
                  <MapPin size={16} />
                  {novedad.direccion}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginación */}
      {novedadesFiltradas.length > itemsPerPage && (
        <div className="mt-4 flex justify-center">
          <Pagination
            total={Math.ceil(novedadesFiltradas.length / itemsPerPage)}
            initialPage={1}
            variant="faded"
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
};

export default NewsTab;
