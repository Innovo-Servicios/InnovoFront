"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import {
  CalendarDays,
  ClipboardList,
  LayoutList,
  RefreshCcw,
  Route,
  Search,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/app/AuthContext";
import { getVistaAsignaciones } from "@/api/adm/api";

interface AssignmentWorker {
  id: string | null;
  nombre: string;
  rut: string;
}

interface AssignmentSector {
  id: string | null;
  nombre: string;
  numero: number | null;
  ruta: number | null;
  empresa: string;
}

interface AssignmentPreview {
  id: string;
  fecha_asignacion: string;
  tipo: "lectura" | "reparto";
  trabajador: AssignmentWorker;
  sector: AssignmentSector;
}

interface WorkerSummary {
  trabajador: AssignmentWorker;
  total: number;
  lectura: number;
  reparto: number;
}

interface AssignmentPreviewResponse {
  resumen: {
    total: number;
    lectura: number;
    reparto: number;
    trabajadores: number;
    sectores: number;
  };
  porTrabajador: WorkerSummary[];
  asignaciones: AssignmentPreview[];
}

type AssignmentTypeFilter = "todos" | "lectura" | "reparto";
type ViewMode = "lista" | "calendario";

const padDatePart = (value: number) => String(value).padStart(2, "0");

const toInputDate = (date: Date) =>
  [date.getFullYear(), padDatePart(date.getMonth() + 1), padDatePart(date.getDate())].join("-");

const getCurrentMonthRange = () => {
  const today = new Date();
  return {
    start: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: toInputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const normalizeText = (value: string | number | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function buildCalendarMonths(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const months: { year: number; month: number; days: (string | null)[] }[] = [];
  let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cur <= endDate) {
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;

    const days: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(`${year}-${padDatePart(month + 1)}-${padDatePart(d)}`);
    }
    months.push({ year, month, days });
    cur = new Date(year, month + 1, 1);
  }
  return months;
}

export default function AsignacionesPage() {
  const { token, authenticatedFetch } = useAuth();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [fechaInicio, setFechaInicio] = useState(defaultRange.start);
  const [fechaFin, setFechaFin] = useState(defaultRange.end);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssignmentTypeFilter>("todos");
  const [empresaFilter, setEmpresaFilter] = useState<string>("todas");
  const [rutaFilter, setRutaFilter] = useState<string>("todas");
  const [sectorFilter, setSectorFilter] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<ViewMode>("calendario");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [data, setData] = useState<AssignmentPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAsignaciones = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await getVistaAsignaciones(token, fechaInicio, fechaFin, authenticatedFetch);
      const text = await response.text();
      const parsedData = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(parsedData?.message || "No se pudieron cargar las asignaciones.");
      setData(parsedData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las asignaciones.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, fechaFin, fechaInicio, token]);

  useEffect(() => {
    if (token) fetchAsignaciones();
  }, [fetchAsignaciones, token]);

  // Cascading filter options derived from loaded data
  const empresas = useMemo(() => {
    const all = data?.asignaciones ?? [];
    return Array.from(new Set(all.map((a) => a.sector.empresa).filter(Boolean))).sort();
  }, [data?.asignaciones]);

  const rutas = useMemo(() => {
    const all = data?.asignaciones ?? [];
    const filtered = empresaFilter === "todas" ? all : all.filter((a) => a.sector.empresa === empresaFilter);
    return Array.from(new Set(filtered.map((a) => a.sector.ruta).filter((r): r is number => r != null))).sort((a, b) => a - b);
  }, [data?.asignaciones, empresaFilter]);

  const sectores = useMemo(() => {
    const all = data?.asignaciones ?? [];
    let filtered = all;
    if (empresaFilter !== "todas") filtered = filtered.filter((a) => a.sector.empresa === empresaFilter);
    if (rutaFilter !== "todas") filtered = filtered.filter((a) => String(a.sector.ruta) === rutaFilter);
    const seen = new Set<string>();
    return filtered
      .reduce<AssignmentSector[]>((acc, a) => {
        if (a.sector.id && !seen.has(a.sector.id)) {
          seen.add(a.sector.id);
          acc.push(a.sector);
        }
        return acc;
      }, [])
      .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  }, [data?.asignaciones, empresaFilter, rutaFilter]);

  const handleEmpresaChange = (val: string) => {
    setEmpresaFilter(val);
    setRutaFilter("todas");
    setSectorFilter("todas");
  };

  const handleRutaChange = (val: string) => {
    setRutaFilter(val);
    setSectorFilter("todas");
  };

  const filteredAssignments = useMemo(() => {
    const all = data?.asignaciones ?? [];
    const query = normalizeText(searchTerm);
    return all.filter((a) => {
      if (typeFilter !== "todos" && a.tipo !== typeFilter) return false;
      if (empresaFilter !== "todas" && a.sector.empresa !== empresaFilter) return false;
      if (rutaFilter !== "todas" && String(a.sector.ruta) !== rutaFilter) return false;
      if (sectorFilter !== "todas" && a.sector.id !== sectorFilter) return false;
      if (!query) return true;
      return [
        a.fecha_asignacion, a.tipo,
        a.trabajador.nombre, a.trabajador.rut,
        a.sector.empresa, a.sector.nombre, a.sector.numero, a.sector.ruta,
      ]
        .map(normalizeText)
        .some((v) => v.includes(query));
    });
  }, [data?.asignaciones, typeFilter, empresaFilter, rutaFilter, sectorFilter, searchTerm]);

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, AssignmentPreview[]>();
    for (const a of filteredAssignments) {
      const existing = map.get(a.fecha_asignacion) ?? [];
      existing.push(a);
      map.set(a.fecha_asignacion, existing);
    }
    return map;
  }, [filteredAssignments]);

  const calendarMonths = useMemo(() => buildCalendarMonths(fechaInicio, fechaFin), [fechaInicio, fechaFin]);

  const selectedDayAssignments = useMemo(
    () => (selectedDay ? (assignmentsByDate.get(selectedDay) ?? []) : []),
    [selectedDay, assignmentsByDate],
  );

  const topWorkers = useMemo(
    () => [...(data?.porTrabajador ?? [])].sort((a, b) => b.total - a.total).slice(0, 6),
    [data?.porTrabajador],
  );

  const summary = data?.resumen ?? { total: 0, lectura: 0, reparto: 0, trabajadores: 0, sectores: 0 };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ClipboardList size={30} className="text-primary" />
          <h1 className="text-3xl font-bold">Vista de asignaciones</h1>
        </div>
        <p className="text-sm text-slate-500">
          Revisa de forma rápida las asignaciones generadas y los trabajadores asignados.
        </p>
      </div>

      {/* Date range + search + refresh */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
        <Input label="Desde" type="date" value={fechaInicio} onValueChange={setFechaInicio} variant="bordered" />
        <Input label="Hasta" type="date" value={fechaFin} onValueChange={setFechaFin} variant="bordered" />
        <Input
          label="Buscar"
          placeholder="Trabajador, RUT, empresa, sector, ruta o tipo"
          startContent={<Search size={18} />}
          value={searchTerm}
          onValueChange={setSearchTerm}
          variant="bordered"
        />
        <Button
          color="primary"
          className="h-14 self-end"
          startContent={!isLoading ? <RefreshCcw size={18} /> : null}
          isLoading={isLoading}
          onPress={fetchAsignaciones}
          isDisabled={!token || isLoading}
        >
          Actualizar
        </Button>
      </div>

      {/* Cascading filters: empresa → ruta → sector */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          label="Empresa"
          selectedKeys={new Set([empresaFilter])}
          onSelectionChange={(keys) => {
            const val = keys === "all" ? "todas" : (Array.from(keys)[0] as string | undefined) ?? "todas";
            handleEmpresaChange(val);
          }}
          variant="bordered"
        >
          <>
            <SelectItem key="todas">Todas las empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e}>{e}</SelectItem>
            ))}
          </>
        </Select>

        <Select
          label="Ruta"
          selectedKeys={new Set([rutaFilter])}
          onSelectionChange={(keys) => {
            const val = keys === "all" ? "todas" : (Array.from(keys)[0] as string | undefined) ?? "todas";
            handleRutaChange(val);
          }}
          variant="bordered"
          isDisabled={empresaFilter === "todas"}
        >
          <>
            <SelectItem key="todas">Todas las rutas</SelectItem>
            {rutas.map((r) => (
              <SelectItem key={String(r)}>Ruta {r}</SelectItem>
            ))}
          </>
        </Select>

        <Select
          label="Sector"
          selectedKeys={new Set([sectorFilter])}
          onSelectionChange={(keys) => {
            const val = keys === "all" ? "todas" : (Array.from(keys)[0] as string | undefined) ?? "todas";
            setSectorFilter(val);
          }}
          variant="bordered"
          isDisabled={rutaFilter === "todas"}
        >
          <>
            <SelectItem key="todas">Todos los sectores</SelectItem>
            {sectores.map((s) => (
              <SelectItem key={s.id ?? s.nombre}>{s.nombre}</SelectItem>
            ))}
          </>
        </Select>
      </div>

      {/* Type filter + view toggle */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["todos", "lectura", "reparto"] as AssignmentTypeFilter[]).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={typeFilter === type ? "solid" : "flat"}
              color={typeFilter === type ? "primary" : "default"}
              onPress={() => setTypeFilter(type)}
            >
              {type === "todos" ? "Todos" : type}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "lista" ? "solid" : "flat"}
            color={viewMode === "lista" ? "primary" : "default"}
            startContent={<LayoutList size={16} />}
            onPress={() => setViewMode("lista")}
          >
            Lista
          </Button>
          <Button
            size="sm"
            variant={viewMode === "calendario" ? "solid" : "flat"}
            color={viewMode === "calendario" ? "primary" : "default"}
            startContent={<CalendarDays size={16} />}
            onPress={() => setViewMode("calendario")}
          >
            Calendario
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card className="mb-5 border border-danger-200 bg-danger-50">
          <CardBody className="text-sm text-danger-700">{errorMessage}</CardBody>
        </Card>
      ) : null}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={<ClipboardList size={20} />} label="Asignaciones" value={summary.total} />
        <SummaryCard icon={<CalendarDays size={20} />} label="Lecturas" value={summary.lectura} />
        <SummaryCard icon={<Route size={20} />} label="Repartos" value={summary.reparto} />
        <SummaryCard icon={<UserRound size={20} />} label="Trabajadores" value={summary.trabajadores} />
        <SummaryCard icon={<Route size={20} />} label="Sectores" value={summary.sectores} />
      </div>

      {/* LIST VIEW */}
      {viewMode === "lista" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <CardHeader className="flex items-center justify-between border-b border-slate-200 bg-white">
              <div>
                <h2 className="text-lg font-semibold">Detalle</h2>
                <p className="text-sm text-slate-500">{filteredAssignments.length} resultados visibles</p>
              </div>
              {isLoading ? <Spinner size="sm" /> : null}
            </CardHeader>
            <CardBody className="p-0">
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 font-semibold">Ruta</th>
                      <th className="px-4 py-3 font-semibold">Sector</th>
                      <th className="px-4 py-3 font-semibold">Trabajador</th>
                      <th className="px-4 py-3 font-semibold">RUT</th>
                      <th className="px-4 py-3 font-semibold">Empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment.id} className="border-t border-slate-100 bg-white hover:bg-slate-50">
                        <td className="px-4 py-3">{formatDate(assignment.fecha_asignacion)}</td>
                        <td className="px-4 py-3">
                          <Chip
                            size="sm"
                            color={assignment.tipo === "lectura" ? "primary" : "secondary"}
                            variant="flat"
                          >
                            {assignment.tipo}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">{assignment.sector.ruta ?? "N/A"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{assignment.sector.nombre}</div>
                          <div className="text-xs text-slate-500">Sector {assignment.sector.numero ?? "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{assignment.trabajador.nombre}</td>
                        <td className="px-4 py-3">{assignment.trabajador.rut || "N/A"}</td>
                        <td className="px-4 py-3">{assignment.sector.empresa || "N/A"}</td>
                      </tr>
                    ))}
                    {!isLoading && filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                          No hay asignaciones para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <WorkerSidebarCard topWorkers={topWorkers} isLoading={isLoading} />
        </div>
      ) : (
        /* CALENDAR VIEW */
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-6">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Spinner />
                </div>
              ) : (
                calendarMonths.map(({ year, month, days }) => (
                  <Card key={`${year}-${month}`} className="overflow-hidden">
                    <CardHeader className="border-b border-slate-200 bg-white">
                      <h2 className="text-lg font-semibold">
                        {MONTH_NAMES[month]} {year}
                      </h2>
                    </CardHeader>
                    <CardBody className="p-3">
                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAY_NAMES.map((d) => (
                          <div
                            key={d}
                            className="pb-1 text-center text-xs font-semibold uppercase text-slate-400"
                          >
                            {d}
                          </div>
                        ))}
                        {days.map((dateStr, i) => {
                          if (!dateStr) return <div key={`empty-${i}`} />;

                          const dayAssignments = assignmentsByDate.get(dateStr) ?? [];
                          const lecturas = dayAssignments.filter((a) => a.tipo === "lectura").length;
                          const repartos = dayAssignments.filter((a) => a.tipo === "reparto").length;
                          const isInRange = dateStr >= fechaInicio && dateStr <= fechaFin;

                          return (
                            <button
                              key={dateStr}
                              onClick={() => {
                                if (dayAssignments.length > 0) setSelectedDay(dateStr);
                              }}
                              className={[
                                "min-h-[56px] rounded-lg border p-1.5 text-left transition-all",
                                dayAssignments.length > 0
                                  ? "cursor-pointer border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5"
                                  : "cursor-default border-slate-100 bg-slate-50",
                                !isInRange ? "opacity-30" : "",
                              ].join(" ")}
                            >
                              <div className="mb-1 text-xs font-semibold text-slate-700">
                                {new Date(`${dateStr}T00:00:00`).getDate()}
                              </div>
                              {dayAssignments.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {lecturas > 0 && (
                                    <span className="rounded bg-primary/15 px-1 text-[10px] font-medium text-primary">
                                      {lecturas} lect.
                                    </span>
                                  )}
                                  {repartos > 0 && (
                                    <span className="rounded bg-secondary/15 px-1 text-[10px] font-medium text-secondary">
                                      {repartos} rep.
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>

            <WorkerSidebarCard topWorkers={topWorkers} isLoading={isLoading} />
          </div>

          {/* Day detail modal */}
          <Modal
            isOpen={selectedDay !== null}
            onClose={() => setSelectedDay(null)}
            size="2xl"
            scrollBehavior="inside"
          >
            <ModalContent>
              <ModalHeader className="flex flex-col gap-1">
                <span>{selectedDay ? formatDate(selectedDay) : ""}</span>
                <span className="text-sm font-normal text-slate-500">
                  {selectedDayAssignments.length} asignación{selectedDayAssignments.length !== 1 ? "es" : ""}
                </span>
              </ModalHeader>
              <ModalBody className="flex flex-col gap-3 pb-6">
                {selectedDayAssignments.map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{a.trabajador.nombre}</p>
                        <p className="text-xs text-slate-500">{a.trabajador.rut || "Sin RUT"}</p>
                      </div>
                      <Chip
                        size="sm"
                        color={a.tipo === "lectura" ? "primary" : "secondary"}
                        variant="flat"
                      >
                        {a.tipo}
                      </Chip>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">Sector</span>
                      <span>{a.sector.nombre} (N°{a.sector.numero ?? "N/A"})</span>
                      <span className="font-medium text-slate-500">Ruta</span>
                      <span>{a.sector.ruta ?? "N/A"}</span>
                      <span className="font-medium text-slate-500">Empresa</span>
                      <span>{a.sector.empresa || "N/A"}</span>
                    </div>
                  </div>
                ))}
              </ModalBody>
            </ModalContent>
          </Modal>
        </>
      )}
    </div>
  );
}

function WorkerSidebarCard({
  topWorkers,
  isLoading,
}: {
  topWorkers: WorkerSummary[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold">Por trabajador</h2>
          <p className="text-sm text-slate-500">Mayores cargas del rango</p>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {topWorkers.map((worker) => (
          <div
            key={worker.trabajador.id ?? worker.trabajador.nombre}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{worker.trabajador.nombre}</p>
                <p className="text-xs text-slate-500">{worker.trabajador.rut || "Sin RUT"}</p>
              </div>
              <Chip color="primary" size="sm" variant="flat">
                {worker.total}
              </Chip>
            </div>
            <div className="mt-3 flex gap-2 text-xs text-slate-600">
              <span>{worker.lectura} lecturas</span>
              <span>{worker.reparto} repartos</span>
            </div>
          </div>
        ))}
        {!isLoading && topWorkers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Sin trabajadores asignados en este rango.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardBody className="flex flex-row items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}
