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
  Spinner,
} from "@heroui/react";
import {
  CalendarDays,
  ClipboardList,
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

const padDatePart = (value: number) => String(value).padStart(2, "0");

const toInputDate = (date: Date) => {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};

const getCurrentMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
};

const formatDate = (date: string) => {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const normalizeText = (value: string | number | null | undefined) => {
  return String(value ?? "").trim().toLowerCase();
};

export default function AsignacionesPage() {
  const { token } = useAuth();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [fechaInicio, setFechaInicio] = useState(defaultRange.start);
  const [fechaFin, setFechaFin] = useState(defaultRange.end);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssignmentTypeFilter>("todos");
  const [data, setData] = useState<AssignmentPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAsignaciones = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getVistaAsignaciones(token, fechaInicio, fechaFin);
      const text = await response.text();
      const parsedData = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(parsedData?.message || "No se pudieron cargar las asignaciones.");
      }

      setData(parsedData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las asignaciones.";

      setErrorMessage(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fechaFin, fechaInicio, token]);

  useEffect(() => {
    if (token) {
      fetchAsignaciones();
    }
  }, [fetchAsignaciones, token]);

  const filteredAssignments = useMemo(() => {
    const assignments = data?.asignaciones ?? [];
    const query = normalizeText(searchTerm);

    return assignments.filter((assignment) => {
      const matchesType =
        typeFilter === "todos" || assignment.tipo === typeFilter;

      if (!matchesType) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        assignment.fecha_asignacion,
        assignment.tipo,
        assignment.trabajador.nombre,
        assignment.trabajador.rut,
        assignment.sector.empresa,
        assignment.sector.nombre,
        assignment.sector.numero,
        assignment.sector.ruta,
      ]
        .map(normalizeText)
        .some((value) => value.includes(query));
    });
  }, [data?.asignaciones, searchTerm, typeFilter]);

  const topWorkers = useMemo(() => {
    return [...(data?.porTrabajador ?? [])]
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [data?.porTrabajador]);

  const summary = data?.resumen ?? {
    total: 0,
    lectura: 0,
    reparto: 0,
    trabajadores: 0,
    sectores: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ClipboardList size={30} className="text-primary" />
          <h1 className="text-3xl font-bold">Vista de asignaciones</h1>
        </div>
        <p className="text-sm text-slate-500">
          Revisa de forma rápida las asignaciones generadas y los trabajadores asignados.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
        <Input
          label="Desde"
          type="date"
          value={fechaInicio}
          onValueChange={setFechaInicio}
          variant="bordered"
        />
        <Input
          label="Hasta"
          type="date"
          value={fechaFin}
          onValueChange={setFechaFin}
          variant="bordered"
        />
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

      <div className="mb-5 flex flex-wrap gap-2">
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

      {errorMessage ? (
        <Card className="mb-5 border border-danger-200 bg-danger-50">
          <CardBody className="text-sm text-danger-700">{errorMessage}</CardBody>
        </Card>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={<ClipboardList size={20} />} label="Asignaciones" value={summary.total} />
        <SummaryCard icon={<CalendarDays size={20} />} label="Lecturas" value={summary.lectura} />
        <SummaryCard icon={<Route size={20} />} label="Repartos" value={summary.reparto} />
        <SummaryCard icon={<UserRound size={20} />} label="Trabajadores" value={summary.trabajadores} />
        <SummaryCard icon={<Route size={20} />} label="Sectores" value={summary.sectores} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between border-b border-slate-200 bg-white">
            <div>
              <h2 className="text-lg font-semibold">Detalle</h2>
              <p className="text-sm text-slate-500">
                {filteredAssignments.length} resultados visibles
              </p>
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
                    <tr key={assignment.id} className="border-t border-slate-100 bg-white">
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
                        <div className="text-xs text-slate-500">
                          Sector {assignment.sector.numero ?? "N/A"}
                        </div>
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
      </div>
    </div>
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
