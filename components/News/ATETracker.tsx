"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionItem,
  ScrollShadow,
  Tabs,
  Tab,
  Card,
  Input,
  CardBody,
  CardHeader,
  Divider,
  Chip,
  Button,
  SelectItem,
  Select,
  DatePicker,
  Image,
  DateRangePicker,
} from "@heroui/react";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  FileTextIcon,
  TruckIcon,
  BookOpenIcon,
  MessageSquareMore,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  DownloadIcon,
  Send,
  Search,
  CalendarDays,
  RotateCcw,
  Info,
} from "lucide-react";
import { parseDate, CalendarDate } from "@internationalized/date";
import { I18nProvider } from "@react-aria/i18n";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";


interface ATE {
  id: string;
  comentario: string;
  foto: string;
  tipo: { _id: string; nombre: string };
  direccion: { _id: string; nombre: string };
  Trabajador: { _id: string; nombre: string };
  fecha_ate: string;
  fotografia: string;
  estado: boolean;
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

export default function ATETracker() {
  const { socket, token } = useAuth();

  const [ates, setAtes] = useState<ATE[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState<string>("stats");

  const [selectedType, setSelectedType] = useState("ate");
  const [selectedTypeSend, setSelectedSendType] = useState("novedadSend");

  const [dateRange, setDateRange] = useState<DateRangeValue>(
    getCurrentMonthRange
  );

  const [dateRangeAte, setDateRangeAte] =
    useState<DateRangeValue>(getCurrentMonthRange);

  const [quickDateFilter, setQuickDateFilter] =
    useState<QuickDateFilter>("month");

  const [selectedDate, setSelectedDate] = useState(
    parseDate(new Date().toISOString().split("T")[0])
  );

  const [selectedSendDate, setSelectedSendDate] = useState(
    parseDate(new Date().toISOString().split("T")[0])
  );

  const fetchATEs = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${URL}/middleware/obtenerATE_Adm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });

      const data = await response.json();

      const ateData = Array.isArray(data?.ate) ? data.ate : [];
      setAtes(ateData);

      if (data?.fecha) {
        setDateRangeAte({
          start: parseDate(new Date(data.fecha).toISOString().split("T")[0]),
          end: parseDate(new Date().toISOString().split("T")[0]),
        });
        setQuickDateFilter("custom");
      }
    } catch (error) {
      console.error("Error al obtener ATEs:", error);
      setAtes([]);
    }
  }, [token]);

  useEffect(() => {
    fetchATEs();
  }, [fetchATEs]);

  useEffect(() => {
    if (!socket) return;

    const handleNuevaAte = () => {
      fetchATEs();
    };

    socket.on("nuevaAte", handleNuevaAte);

    return () => {
      socket.off("nuevaAte", handleNuevaAte);
    };
  }, [socket, fetchATEs]);

  const changeListAte = async (value: DateRangeValue) => {
    if (!token) return;

    try {
      const fechas = {
        inicio: value.start.toString(),
        fin: value.end.toString(),
      };

      const response = await fetch(`${URL}/middleware/obtenerATE_Adm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, fecha: fechas }),
        cache: "no-store",
      });

      const data = await response.json();

      setDateRangeAte({
        start: parseDate(value.start.toString()),
        end: parseDate(value.end.toString()),
      });

      setAtes(Array.isArray(data?.ate) ? data.ate : []);
    } catch (error) {
      console.error("Error al filtrar ATEs por fecha:", error);
      setAtes([]);
    }
  };

  const applyQuickDateFilter = (filter: QuickDateFilter) => {
    setQuickDateFilter(filter);

    if (filter === "today") {
      const range = getTodayRange();
      changeListAte(range);
      return;
    }

    if (filter === "last7") {
      const range = getLastSevenDaysRange();
      changeListAte(range);
      return;
    }

    if (filter === "month") {
      const range = getCurrentMonthRange();
      changeListAte(range);
      return;
    }
  };

  const resetAteFilters = () => {
    setSearchTerm("");
    const range = getCurrentMonthRange();
    setQuickDateFilter("month");
    changeListAte(range);
  };

  const filteredAtes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return ates;

    return ates.filter((ate) => {
      return (
        ate.tipo.nombre.toLowerCase().includes(query) ||
        ate.Trabajador.nombre.toLowerCase().includes(query) ||
        ate.direccion.nombre.toLowerCase().includes(query) ||
        ate.fecha_ate.toLowerCase().includes(query) ||
        (ate.comentario || "").toLowerCase().includes(query)
      );
    });
  }, [searchTerm, ates]);

  const getATETypeIcon = (type: string) => {
    switch (type) {
      case "Atención Especial-Reparto":
        return <TruckIcon size={22} />;
      case "Atención Especial-Lectura":
        return <BookOpenIcon size={22} />;
      default:
        return <FileTextIcon size={22} />;
    }
  };

  const getShortATEType = (type: string) => {
    return type.replace("Atención Especial-", "");
  };

  const getStatsData = () => {
    const totalAtes = filteredAtes.length;
    const completedAtes = filteredAtes.filter((ate) => ate.estado).length;
    const pendingAtes = totalAtes - completedAtes;
    const completionRate =
      totalAtes === 0 ? 0 : Math.round((completedAtes / totalAtes) * 100);

    const typeStats = filteredAtes.reduce((acc, ate) => {
      const typeName = ate.tipo.nombre;
        
      if (!acc[typeName]) {
        acc[typeName] = {
          total: 0,
          completed: 0,
          pending: 0,
        };
      }
    
      acc[typeName].total += 1;
    
      if (ate.estado) {
        acc[typeName].completed += 1;
      } else {
        acc[typeName].pending += 1;
      }
    
      return acc;
    }, {} as Record<string, { total: number; completed: number; pending: number }>);

    const workerPendingStats = filteredAtes.reduce((acc, ate) => {
      if (ate.estado) return acc;

      const workerName = ate.Trabajador.nombre;

      acc[workerName] = (acc[workerName] || 0) + 1;

      return acc;
    }, {} as Record<string, number>);

    return {
      totalAtes,
      completedAtes,
      pendingAtes,
      completionRate,
      typeStats,
      workerPendingStats,
    };
  };

  const handleDownload = async () => {
    if (!dateRange.start || !dateRange.end || selectedType === "") {
      alert("Seleccione un rango de fechas y un tipo de datos");
      return;
    }

    try {
      if (selectedType === "ate") {
        const response = await fetch(`${URL}/excel/ate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fecha: selectedDate.toString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Error al descargar las estadísticas");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.style.display = "none";
        a.href = url;
        a.download = "AtencionesEspeciales.zip";
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const response = await fetch(`${URL}/excel/novedad`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fechainicio: dateRange.start.toString(),
            fechafin: dateRange.end.toString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Error al descargar las estadísticas");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.style.display = "none";
        a.href = url;
        a.download = "Novedades.zip";
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error al descargar las estadísticas:", error);
    }
  };

  const sendNovedad = async () => {
    try {
      const response = await fetch(`${URL}/novedad/correo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: selectedSendDate.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar las novedades");
      }

      alert("Novedades enviadas correctamente");
    } catch (error) {
      console.error("Error al enviar las novedades:", error);
    }
  };

  const sendVerificacion = async () => {
    try {
      const response = await fetch(`${URL}/novedad/verificacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: selectedSendDate.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar las verificaciones");
      }

      alert("Verificaciones enviadas correctamente");
    } catch (error) {
      console.error("Error al enviar las verificaciones:", error);
    }
  };

  const SendData = async () => {
    if (!selectedSendDate || selectedTypeSend === "") {
      alert("Seleccione una fecha y un tipo de datos");
      return;
    }

    if (selectedTypeSend === "novedadSend") {
      sendNovedad();
    } else {
      sendVerificacion();
    }
  };

  const downloadFile = (fileUri: string, fileName: string) => {
    try {
      const parsedUri = new window.URL(fileUri, window.location.origin);
      const allowedBase = new window.URL(URL, window.location.origin);
      const allowedPath =
        allowedBase.pathname === "/" ? "/" : allowedBase.pathname;

      if (!["http:", "https:"].includes(parsedUri.protocol)) {
        throw new Error("Protocolo de archivo no permitido");
      }

      if (parsedUri.origin !== allowedBase.origin) {
        throw new Error("Origen de archivo no permitido para evitar SSRF");
      }

      if (allowedPath !== "/" && !parsedUri.pathname.startsWith(allowedPath)) {
        throw new Error("Ruta de archivo no permitida");
      }

      const link = document.createElement("a");
      link.href = parsedUri.toString();
      link.setAttribute("download", fileName);
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
    }
  };

  const {
    totalAtes,
    completedAtes,
    pendingAtes,
    completionRate,
    typeStats,
    workerPendingStats,
  } = getStatsData();

  const progressHue = Math.round((completionRate / 100) * 120);
  const progressColor = `hsl(${progressHue}, 75%, 45%)`;

  return (
    <Card className="h-full w-full rounded-none border-none shadow-none">
      <CardHeader className="flex shrink-0 flex-col items-start gap-3 px-4 pt-4 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Seguimiento de ATEs
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Visualiza y gestiona las atenciones especiales asignadas.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Input
            aria-label="Buscar ATE"
            placeholder="Buscar por trabajador, dirección, tipo o comentario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="bordered"
            startContent={<Search size={18} className="text-default-400" />}
            classNames={{
              inputWrapper: "h-11 rounded-xl border-default-200 bg-white",
              input: "text-sm",
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <I18nProvider locale="es-CL">
              <DateRangePicker
                label="Rango de fechas"
                value={{
                  start: dateRangeAte.start,
                  end: dateRangeAte.end,
                }}
                variant="bordered"
                classNames={{
                  base: "w-full max-w-[330px]",
                  inputWrapper: "h-11 rounded-xl border-default-200 bg-white",
                }}
                onChange={(value) => {
                  if (value) {
                    setQuickDateFilter("custom");
                    changeListAte({
                      start: value.start,
                      end: value.end,
                    });
                  }
                }}
              />
            </I18nProvider>

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
              7 días
            </Button>

            <Button
              size="sm"
              variant={quickDateFilter === "month" ? "solid" : "flat"}
              color={quickDateFilter === "month" ? "primary" : "default"}
              className="rounded-xl font-semibold"
              onPress={() => applyQuickDateFilter("month")}
            >
              Mes
            </Button>

            <Button
              isIconOnly
              size="sm"
              variant="flat"
              className="rounded-xl"
              onPress={resetAteFilters}
              aria-label="Restablecer filtros ATE"
            >
              <RotateCcw size={16} />
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <p>
              Estos filtros afectan la vista general y la lista de atenciones
              especiales.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="flex min-h-0 flex-col p-0">
        <Tabs
        aria-label="ATE Visualization Options"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
        className="w-full px-4 pb-3"
        classNames={{
          tabList: "rounded-xl bg-slate-100 p-1",
          cursor: "rounded-lg bg-primary shadow-sm",
          tab: "h-9 px-4",
          tabContent:
            "text-sm font-medium group-data-[selected=true]:text-white text-slate-600",
        }}
      >
          <Tab key="stats" title="Vista General" aria-label="Stats">
            <Divider />

            <ScrollShadow hideScrollBar className="h-full w-full p-4">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <FileTextIcon size={20} />
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Resumen general
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Estado general según los filtros aplicados.
                        </p>
                      </div>
                    </div>

                    <Chip color="primary" variant="flat">
                      {filteredAtes.length} resultado
                      {filteredAtes.length === 1 ? "" : "s"}
                    </Chip>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Card className="border border-slate-100 shadow-sm">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">
                              Total ATEs
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                              {totalAtes}
                            </p>
                          </div>

                          <FileTextIcon size={24} className="text-blue-500" />
                        </div>
                      </CardBody>
                    </Card>

                    <Card className="border border-slate-100 shadow-sm">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">
                              Completadas
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                              {completedAtes}
                            </p>
                          </div>

                          <CheckCircleIcon
                            size={24}
                            className="text-green-500"
                          />
                        </div>
                      </CardBody>
                    </Card>

                    <Card className="border border-slate-100 shadow-sm">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">
                              Pendientes
                            </p>
                            <p className="text-2xl font-bold text-slate-900">
                              {pendingAtes}
                            </p>
                          </div>

                          <ClockIcon size={24} className="text-yellow-500" />
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <CheckCircleIcon size={20} />
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Tasa de finalización
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Porcentaje de ATEs completadas en el periodo de tiempo.
                        </p>
                      </div>
                    </div>

                    <span className="text-2xl font-bold text-slate-900">
                      {completionRate}%
                    </span>
                  </div>

                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${completionRate}%`,
                        backgroundColor: progressColor,
                      }}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <TruckIcon size={20} />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Distribución por tipo
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Cantidad de atenciones agrupadas por categoría.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(typeStats).length > 0 ? (
                      Object.entries(typeStats).map(([type, stats]) => {
                        const completionPercent =
                          stats.total === 0
                            ? 0
                            : Math.round((stats.completed / stats.total) * 100);
                      
                        return (
                          <div
                            key={type}
                            className="rounded-xl bg-slate-50 px-3 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                {getATETypeIcon(type)}
                        
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {getShortATEType(type)}
                                  </p>
                        
                                  <p className="text-xs text-slate-500">
                                    {stats.completed}/{stats.total} completadas ·{" "}
                                    {stats.pending} pendientes
                                  </p>
                                </div>
                              </div>
                        
                              <Chip size="sm" variant="flat">
                                {stats.total}
                              </Chip>
                            </div>
                        
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-green-500"
                                style={{ width: `${completionPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">
                        No hay datos para mostrar.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <UsersIcon size={20} />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Trabajadores con pendientes
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Personas con atenciones especiales aún sin completar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(workerPendingStats).length > 0 ? (
                      Object.entries(workerPendingStats)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([worker, pendingCount]) => (
                          <div
                            key={worker}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <UsersIcon size={18} />
                        
                              <span className="truncate text-sm font-medium text-slate-800">
                                {worker}
                              </span>
                            </div>
                        
                            <Chip color="warning" size="sm" variant="flat">
                              {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
                            </Chip>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-4 text-sm text-green-700">
                        No hay trabajadores con atenciones pendientes para los filtros actuales.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </ScrollShadow>
          </Tab>

          <Tab key="Ate" title="Atenciones Especiales" aria-label="ATE List">
            <Divider />

            <ScrollShadow hideScrollBar className="h-full w-full px-3 py-4">
              {filteredAtes.length > 0 ? (
                <Accordion className="scrollbar-hide" variant="splitted">
                  {filteredAtes.map((ate) => (
                    <AccordionItem
                      key={ate.id}
                      id="ate"
                      aria-label="ATE"
                      title={
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                              {getATETypeIcon(ate.tipo.nombre)}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold text-slate-900">
                                  {getShortATEType(ate.tipo.nombre)}
                                </span>

                                <Chip size="sm" color="default" variant="flat">
                                  {ate.fecha_ate.split("T")[0]}
                                </Chip>
                              </div>

                              <p className="truncate text-xs text-slate-500">
                                {ate.Trabajador.nombre} · {ate.direccion.nombre}
                              </p>
                            </div>
                          </div>

                          <Chip
                            color={ate.estado ? "success" : "warning"}
                            variant="flat"
                          >
                            {ate.estado ? "Completado" : "Pendiente"}
                          </Chip>
                        </div>
                      }
                    >
                      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <CalendarIcon size={18} />
                          <span>{new Date(ate.fecha_ate).toLocaleString()}</span>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <UserIcon size={18} />
                          <span>{ate.Trabajador.nombre}</span>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPinIcon size={18} />
                          <span>{ate.direccion.nombre}</span>
                        </div>

                        {ate.comentario && (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MessageSquareMore
                              size={18}
                              className="mt-1 flex-shrink-0"
                            />
                            <span>{ate.comentario}</span>
                          </div>
                        )}

                        {ate.fotografia && (
                          <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
                            <Divider />

                            <Image
                              src={`${URL}/${ate.fotografia}`}
                              isZoomed
                              alt="Fotografía de la ATE"
                              width={300}
                              height={300}
                              className="mt-4 mb-4 border border-slate-200 shadow-lg"
                              onClick={() =>
                                downloadFile(
                                  `${URL}/${ate.fotografia}`,
                                  "FotografiaATE"
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  No hay atenciones especiales para los filtros seleccionados.
                </div>
              )}
            </ScrollShadow>
          </Tab>

          <Tab
            key="download&send"
            title="Enviar y descargar"
            aria-label="Download Stats"
          >
            <Divider />

            <ScrollShadow hideScrollBar className="h-full w-full p-4">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Descargar datos
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Exporta estadísticas o novedades según la fecha seleccionada.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {selectedType === "ate" ? (
                      <I18nProvider locale="es-CL">
                        <DatePicker
                          label="Fecha"
                          value={selectedDate}
                          variant="bordered"
                          onChange={(date) => {
                            if (date) {
                              setSelectedDate(date);
                            }
                          }}
                        />
                      </I18nProvider>
                    ) : (
                      <I18nProvider locale="es-CL">
                        <DateRangePicker
                          label="Rango de fechas"
                          value={{
                            start: dateRange.start,
                            end: dateRange.end,
                          }}
                          variant="bordered"
                          onChange={(value) => {
                            if (value) {
                              setDateRange({
                                start: value.start,
                                end: value.end,
                              });
                            }
                          }}
                        />
                      </I18nProvider>
                    )}

                    <Select
                      label="Tipo de datos"
                      placeholder="Seleccione el tipo de datos"
                      selectedKeys={[selectedType]}
                      onChange={(e) => setSelectedType(e.target.value)}
                      variant="bordered"
                    >
                      <SelectItem key="ate">Atención especial</SelectItem>
                      <SelectItem key="novedad">Novedad</SelectItem>
                    </Select>
                  </div>

                  <Button
                    color="primary"
                    endContent={<DownloadIcon size={16} />}
                    onPress={handleDownload}
                    disabled={!dateRange.start || !dateRange.end || !selectedDate}
                    variant="bordered"
                    className="mt-4"
                  >
                    Descargar estadísticas
                  </Button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Enviar novedades asignadas
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Envía por correo las novedades o verificaciones asignadas.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <I18nProvider locale="es-CL">
                      <DatePicker
                        label="Fecha de la asignación"
                        value={selectedSendDate}
                        variant="bordered"
                        onChange={(date) => {
                          if (date) {
                            setSelectedSendDate(date);
                          }
                        }}
                      />
                    </I18nProvider>

                    <Select
                      label="Tipo de datos"
                      placeholder="Seleccione el tipo de datos"
                      selectedKeys={[selectedTypeSend]}
                      onChange={(e) => setSelectedSendType(e.target.value)}
                      variant="bordered"
                    >
                      <SelectItem key="novedadSend">Novedad</SelectItem>
                      <SelectItem key="verificacion">Verificación</SelectItem>
                    </Select>
                  </div>

                  <Button
                    color="success"
                    endContent={<Send size={16} />}
                    onPress={SendData}
                    variant="bordered"
                    className="mt-4"
                  >
                    Enviar datos
                  </Button>
                </section>
              </div>
            </ScrollShadow>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
}