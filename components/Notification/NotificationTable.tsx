"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  DateRangePicker,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Pagination,
  Chip,
  Spinner,
} from "@heroui/react";
import { Search, Bell, CircleAlert, File, ListFilter } from "lucide-react";
import { parseDate } from "@internationalized/date";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
import { I18nProvider } from "@react-aria/i18n";
interface Notification {
  _id: number | string; // Puede ser número o cadena
  tipo: "msg" | "alert" | "document";
  titulo: string;
  mensaje: string;
  contenido: string;
  fecha: string;
}

interface NotificationTableProps {
  onRowClick: (notification: Notification) => void;
}

export default function NotificationTable({
  onRowClick,
}: NotificationTableProps) {
  const { token, socket } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({
    start: parseDate(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0]
    ),
    end: parseDate(new Date().toISOString().split("T")[0]),
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedType, setSelectedType] = useState(new Set(["Todos"]));
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 12;
  const fetchNotifications = async () => {
    const datos_body = {
      token,
      inicio: dateRange.start.toString(),
      fin: dateRange.end.toString(),
    };
    const response = await fetch(`${URL}/notificaciones/buscarNotificacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos_body),
    });
    const data = await response.json();
    setNotifications(data);
    setIsLoading(false);
  };
  useEffect(() => {
    if (socket && token) {
      fetchNotifications();

      socket.on("nuevaNotificacion", () => {
        fetchNotifications();
      });

      return () => {
        socket.off("nuevaNotificacion");
      };
    }
  }, [token, dateRange, socket]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notification) => {
        return (
          (searchQuery === "" ||
            notification.mensaje
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            notification.titulo
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) &&
          (selectedType.has("Todos") || selectedType.has(notification.tipo))
        );
      })
      .map((notification, index) => ({
        ...notification,
        uniqueKey: notification._id || `temp-key-${index}`,
      }));
  }, [notifications, searchQuery, selectedType]);

  const typeOptions = [
    { value: "Todos", label: "Todos" },
    { value: "msg", label: "Mensajes" },
    { value: "alert", label: "Alertas" },
    { value: "document", label: "Documentos" },
  ];
  // Paginación
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, currentPage, itemsPerPage]);
  // Manejo de selección
  const handleSelectionChange = useCallback(
    (keys: Set<string>, setSelectedType: Function) => {
      let updatedKeys = new Set(keys);
      if (Array.from(updatedKeys).pop() === "Todos") {
        updatedKeys.clear();
        updatedKeys.add("Todos");
      }
      // Si "Todos" está seleccionado y se elige otro, "Todos" se deselecciona automáticamente
      if (updatedKeys.has("Todos") && updatedKeys.size > 1) {
        updatedKeys.delete("Todos");
      }

      // Si todos los demás elementos están seleccionados, activar "Todos" y deseleccionar el resto
      const allOtherSelected = typeOptions
        .filter((option) => option.value !== "Todos")
        .every((option) => updatedKeys.has(option.value));

      if (allOtherSelected) {
        updatedKeys.clear();
        updatedKeys.add("Todos");
      }

      // Si no hay ningún elemento seleccionado, activar "Todos" automáticamente
      if (updatedKeys.size === 0) {
        updatedKeys.add("Todos");
      }

      setSelectedType(updatedKeys);
    },
    []
  );

  return (
    <div className="flex flex-col h-full p-4">
      <h1 className="text-2xl font-bold mb-4">Notificaciones</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          label="Buscar"
          placeholder="Buscar notificación"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<Search className="text-default-400" />}
          className="max-w-xs"
          variant="bordered"
        />
        <I18nProvider locale="es-CL">
          <DateRangePicker
            label="Rango de fechas"
            defaultValue={{
              start: dateRange.start,
              end: dateRange.end,
            }}
            className="max-w-xs"
            onChange={(value) => {
              if (value) {
                setDateRange({ start: value.start, end: value.end });
              }
            }}
            variant="bordered"
          />
        </I18nProvider>
        <div className="ml-auto">
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="bordered"
                startContent={<ListFilter size={24} color="black" />}
                size="lg"
              >
                Tipo
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Notification Types"
              selectionMode="multiple"
              selectedKeys={selectedType}
              closeOnSelect={false} // Evita que el dropdown se cierre al seleccionar
              onSelectionChange={(keys) =>
                handleSelectionChange(
                  new Set(keys as unknown as string[]),
                  setSelectedType
                )
              }
            >
              {typeOptions.map((type) => (
                <DropdownItem key={type.value}>{type.label}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        <Table
          aria-label="Notifications table"
          classNames={{
            table: "min-h-[100px] max-h-[93.5vh]",
            wrapper: "bg-[transparent] p-0",
            th: "bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 bg-[length:500%_100%] text-slate-800 font-bold text-sm border-r-2 border-white last:border-r-0",
            td: "text-md px-2 text-center",
          }}
          shadow="none"
          isStriped
          color="primary"
          selectionMode="single"
        >
          <TableHeader>
            <TableColumn className="text-center">TIPO</TableColumn>
            <TableColumn className="text-center">TÍTULO</TableColumn>
            <TableColumn className="text-center">MENSAJE</TableColumn>
            <TableColumn className="text-center">CONTENIDO</TableColumn>
            <TableColumn className="text-center">FECHA</TableColumn>
          </TableHeader>
          <TableBody
            items={paginatedNotifications}
            isLoading={isLoading}
            loadingContent={<Spinner label="Cargando trabajadores..." />}
          >
            {(item: Notification) => (
              <TableRow
                key={item._id}
                onClick={() => onRowClick(item)}
                className="cursor-pointer"
              >
                <TableCell>
                  <Chip
                    variant="flat"
                    color={
                      item.tipo === "msg"
                        ? "primary"
                        : item.tipo === "alert"
                        ? "warning"
                        : "success"
                    }
                  >
                    {item.tipo === "msg" ? (
                      <Bell size={24} />
                    ) : item.tipo === "alert" ? (
                      <CircleAlert size={24} />
                    ) : (
                      <File size={24} />
                    )}
                  </Chip>
                </TableCell>
                <TableCell>
                  {item.titulo.length > 24
                    ? `${item.titulo.substring(0, 24)}...`
                    : item.titulo}
                </TableCell>
                <TableCell>
                  {item.mensaje.length > 30
                    ? `${item.mensaje.substring(0, 30)}...`
                    : item.mensaje}
                </TableCell>
                <TableCell>
                  {item.contenido.length > 50
                    ? `${item.contenido.substring(0, 50)}...`
                    : item.contenido}
                </TableCell>
                <TableCell>{item.fecha.split('T')[0]}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="mt-auto flex justify-center pb-4">
          <Pagination
            total={totalPages}
            initialPage={1}
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}
