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
  Pagination,
  Chip,
  Spinner,
} from "@heroui/react";
import {
  Search,
  Bell,
  CircleAlert,
  File,
  ListFilter,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import { parseDate, CalendarDate } from "@internationalized/date";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
import { I18nProvider } from "@react-aria/i18n";

interface Notification {
  _id: number | string;
  tipo: "msg" | "alert" | "document";
  titulo: string;
  mensaje: string;
  contenido: string;
  fecha: string;
}

interface NotificationWithKey extends Notification {
  uniqueKey: string | number;
}

interface NotificationTableProps {
  onRowClick: (notification: Notification) => void;
}

type DateRangeValue = {
  start: CalendarDate;
  end: CalendarDate;
};

type QuickDateFilter = "today" | "last7" | "month" | "custom";

const toCalendarDate = (date: Date) => {
  return parseDate(date.toISOString().split("T")[0]);
};

const getTodayRange = (): DateRangeValue => {
  const today = new Date();

  return {
    start: toCalendarDate(today),
    end: toCalendarDate(today),
  };
};

const getLastSevenDaysRange = (): DateRangeValue => {
  const today = new Date();
  const sevenDaysAgo = new Date();

  sevenDaysAgo.setDate(today.getDate() - 6);

  return {
    start: toCalendarDate(sevenDaysAgo),
    end: toCalendarDate(today),
  };
};

const getCurrentMonthRange = (): DateRangeValue => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    start: toCalendarDate(firstDayOfMonth),
    end: toCalendarDate(today),
  };
};

export default function NotificationTable({
  onRowClick,
}: NotificationTableProps) {
  const { token, socket } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(getTodayRange);
  const [quickDateFilter, setQuickDateFilter] =
    useState<QuickDateFilter>("today");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedType, setSelectedType] = useState<Set<string>>(
    new Set(["Todos"])
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const itemsPerPage = 12;

  const typeOptions = [
    { value: "Todos", label: "Todos" },
    { value: "msg", label: "Mensajes" },
    { value: "alert", label: "Alertas" },
    { value: "document", label: "Documentos" },
  ];

  useEffect(() => {
    setDateRange(getTodayRange());
    setQuickDateFilter("today");
  }, []);

  const applyQuickDateFilter = (filter: QuickDateFilter) => {
    setQuickDateFilter(filter);

    if (filter === "today") {
      setDateRange(getTodayRange());
      return;
    }

    if (filter === "last7") {
      setDateRange(getLastSevenDaysRange());
      return;
    }

    if (filter === "month") {
      setDateRange(getCurrentMonthRange());
      return;
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedType(new Set(["Todos"]));
    setDateRange(getTodayRange());
    setQuickDateFilter("today");
    setCurrentPage(1);
  };

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const datos_body = {
        token,
        inicio: dateRange.start.toString(),
        fin: dateRange.end.toString(),
      };

      const response = await fetch(`${URL}/notificaciones/buscarNotificacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos_body),
        cache: "no-store",
      });

      const data = await response.json();

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, dateRange.start, dateRange.end]);

  useEffect(() => {
    if (!token) return;

    fetchNotifications();
  }, [token, dateRange, fetchNotifications]);

  useEffect(() => {
    if (!socket || !token) return;

    socket.on("nuevaNotificacion", () => {
      fetchNotifications();
    });

    return () => {
      socket.off("nuevaNotificacion");
    };
  }, [socket, token, fetchNotifications]);

  const filteredNotifications = useMemo<NotificationWithKey[]>(() => {
    return notifications
      .filter((notification) => {
        const lowerSearchQuery = searchQuery.toLowerCase();

        const matchesSearch =
          searchQuery === "" ||
          notification.mensaje.toLowerCase().includes(lowerSearchQuery) ||
          notification.titulo.toLowerCase().includes(lowerSearchQuery) ||
          notification.contenido.toLowerCase().includes(lowerSearchQuery);

        const matchesType =
          selectedType.has("Todos") || selectedType.has(notification.tipo);

        return matchesSearch && matchesType;
      })
      .map((notification, index) => ({
        ...notification,
        uniqueKey: notification._id || `temp-key-${index}`,
      }));
  }, [notifications, searchQuery, selectedType]);

  const totalPages = useMemo(() => {
    return Math.max(Math.ceil(filteredNotifications.length / itemsPerPage), 1);
  }, [filteredNotifications.length]);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, dateRange]);

  const handleSelectionChange = useCallback((keys: Set<string>) => {
    const updatedKeys = new Set(keys);

    if (Array.from(updatedKeys).pop() === "Todos") {
      updatedKeys.clear();
      updatedKeys.add("Todos");
    }

    if (updatedKeys.has("Todos") && updatedKeys.size > 1) {
      updatedKeys.delete("Todos");
    }

    const allOtherSelected = typeOptions
      .filter((option) => option.value !== "Todos")
      .every((option) => updatedKeys.has(option.value));

    if (allOtherSelected) {
      updatedKeys.clear();
      updatedKeys.add("Todos");
    }

    if (updatedKeys.size === 0) {
      updatedKeys.add("Todos");
    }

    setSelectedType(updatedKeys);
  }, []);

  const getTypeButtonLabel = () => {
    if (selectedType.has("Todos")) return "Tipo";

    const selectedLabels = typeOptions
      .filter((option) => selectedType.has(option.value))
      .map((option) => option.label);

    if (selectedLabels.length === 1) return selectedLabels[0];

    return `${selectedLabels.length} tipos`;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Notificaciones</h1>

        <p className="mt-1 text-sm text-slate-500">
          Busca, filtra y revisa las notificaciones enviadas.
        </p>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Input
              placeholder="Buscar notificación"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search size={18} className="text-default-400" />}
              variant="bordered"
              classNames={{
                base: "w-full max-w-[360px]",
                mainWrapper: "w-full",
                inputWrapper: "h-11 rounded-xl border-default-200 bg-white",
                input: "text-sm",
              }}
            />

            <I18nProvider locale="es-CL">
              <DateRangePicker
                label="Rango de fechas"
                value={{
                  start: dateRange.start,
                  end: dateRange.end,
                }}
                onChange={(value) => {
                  if (value) {
                    setDateRange({
                      start: value.start,
                      end: value.end,
                    });
                    setQuickDateFilter("custom");
                  }
                }}
                variant="bordered"
                classNames={{
                  base: "w-full max-w-[330px]",
                  inputWrapper: "h-11 rounded-xl border-default-200 bg-white",
                }}
              />
            </I18nProvider>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="flat"
                  startContent={<ListFilter size={18} color="black" />}
                  className="h-11 min-w-[120px] rounded-xl"
                >
                  {getTypeButtonLabel()}
                </Button>
              </DropdownTrigger>

              <DropdownMenu
                aria-label="Notification Types"
                selectionMode="multiple"
                selectedKeys={selectedType}
                closeOnSelect={false}
                onSelectionChange={(keys) =>
                  handleSelectionChange(new Set(keys as unknown as string[]))
                }
              >
                {typeOptions.map((type) => (
                  <DropdownItem key={type.value}>{type.label}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            <Button
              isIconOnly
              variant="flat"
              className="h-11 w-11 rounded-xl"
              onPress={resetFilters}
              aria-label="Restablecer filtros"
            >
              <RotateCcw size={18} />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={quickDateFilter === "today" ? "solid" : "flat"}
            color={quickDateFilter === "today" ? "primary" : "default"}
            className="rounded-xl font-semibold"
            startContent={<CalendarDays size={15} />}
            onPress={() => applyQuickDateFilter("today")}
          >
            Hoy
          </Button>

          <Button
            size="sm"
            variant={quickDateFilter === "last7" ? "solid" : "flat"}
            color={quickDateFilter === "last7" ? "primary" : "default"}
            className="rounded-xl font-semibold"
            onPress={() => applyQuickDateFilter("last7")}
          >
            Últimos 7 días
          </Button>

          <Button
            size="sm"
            variant={quickDateFilter === "month" ? "solid" : "flat"}
            color={quickDateFilter === "month" ? "primary" : "default"}
            className="rounded-xl font-semibold"
            onPress={() => applyQuickDateFilter("month")}
          >
            Este mes
          </Button>

          {quickDateFilter === "custom" && (
            <Chip color="primary" variant="flat" className="font-medium">
              Rango personalizado
            </Chip>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-2">
        <Table
          aria-label="Notifications table"
          classNames={{
            table: "min-h-[100px] min-w-[900px]",
            wrapper: "bg-transparent p-0 shadow-none overflow-visible",
            th: "bg-gradient-to-r from-blue-100 via-purple-200 to-blue-100 text-slate-800 font-bold text-sm border-r-2 border-white last:border-r-0",
            td: "text-md px-2 text-center whitespace-nowrap",
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
            loadingContent={<Spinner label="Cargando notificaciones..." />}
            emptyContent="No hay notificaciones para mostrar."
          >
            {(item: NotificationWithKey) => (
              <TableRow
                key={item.uniqueKey}
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

                <TableCell>{item.fecha.split("T")[0]}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="shrink-0 flex justify-center py-3">
        <Pagination
          total={totalPages}
          page={currentPage}
          variant="faded"
          onChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
}