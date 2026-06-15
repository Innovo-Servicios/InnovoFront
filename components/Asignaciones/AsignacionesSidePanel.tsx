"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Inbox,
  RefreshCw,
} from "lucide-react";

import { getVistaAsignaciones } from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";

type AssignmentType = "lectura" | "reparto";

interface ExistingAssignmentView {
  id: string;
  fecha_asignacion: string;
  tipo: AssignmentType;
  trabajador: {
    id: string;
    nombre: string;
    rut: string;
    cargo: string;
  };
  sector: {
    id: string | null;
    nombre: string;
    numero: number | null;
    ruta: number | null;
    empresa: string;
  };
}

const currentMonthValue = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

const nextMonthValue = () => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return `${nextMonth.getFullYear()}-${String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0")}`;
};

const selectionToArray = (keys: unknown) => {
  if (keys === "all") return [];

  return Array.from(keys as Iterable<unknown>).map(String);
};

const parseJsonResponse = async (
  response: Response,
  fallbackMessage: string
) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
};

const monthBoundsFromValue = (monthValue: string) => {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const endDate = new Date(year, month, 0).getDate();

  return {
    start: `${yearText}-${monthText}-01`,
    end: `${yearText}-${monthText}-${String(endDate).padStart(2, "0")}`,
  };
};

const monthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split("-");

  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "es-CL",
    {
      month: "long",
      year: "numeric",
    }
  );
};

const downloadBlob = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};

export default function AsignacionesViewerPanel() {
  const { token, authenticatedFetch } = useAuth();

  const [empresa, setEmpresa] = useState("GasValpo");
  const [monthValue, setMonthValue] = useState(nextMonthValue);
  const [assignments, setAssignments] = useState<ExistingAssignmentView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableCompanies = ["GasValpo", "Comercial"];

  const stats = useMemo(() => {
    const uniqueRoutes = new Set(
      assignments
        .map((assignment) => assignment.sector.ruta)
        .filter((route) => route !== null && route !== undefined)
    );

    const uniqueWorkers = new Set(
      assignments
        .map((assignment) => assignment.trabajador?.id)
        .filter(Boolean)
    );

    const uniqueSectors = new Set(
      assignments
        .map((assignment) => assignment.sector?.id)
        .filter(Boolean)
    );

    const lectura = assignments.filter(
      (assignment) => assignment.tipo === "lectura"
    ).length;

    const reparto = assignments.filter(
      (assignment) => assignment.tipo === "reparto"
    ).length;

    return {
      total: assignments.length,
      routes: uniqueRoutes.size,
      workers: uniqueWorkers.size,
      sectors: uniqueSectors.size,
      lectura,
      reparto,
    };
  }, [assignments]);

  const loadAssignments = useCallback(async () => {
    if (!token || !empresa || !monthValue) return;

    const bounds = monthBoundsFromValue(monthValue);

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getVistaAsignaciones(
        token,
        bounds.start,
        bounds.end,
        authenticatedFetch
      );

      const data = await parseJsonResponse(
        response,
        "No se pudo cargar la asignación."
      );

      const allAssignments = Array.isArray(data?.asignaciones)
        ? data.asignaciones
        : [];

      const filtered = allAssignments.filter(
        (assignment: ExistingAssignmentView) =>
          !empresa || assignment.sector?.empresa === empresa
      );

      setAssignments(filtered);
    } catch (error) {
      setAssignments([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la asignación."
      );
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, empresa, monthValue, token]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const downloadCSV = () => {
    const header = [
      "Fecha",
      "Tipo",
      "Ruta",
      "Sector",
      "Trabajador",
      "RUT",
      "Empresa",
    ];

    const rows = assignments.map((assignment) => [
      assignment.fecha_asignacion,
      assignment.tipo,
      assignment.sector.ruta ?? "",
      assignment.sector.nombre ?? "",
      assignment.trabajador.nombre ?? "",
      assignment.trabajador.rut ?? "",
      assignment.sector.empresa ?? "",
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
      )
      .join("\n");

    downloadBlob(
      `asignaciones_${empresa}_${monthValue}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  };

  const downloadJSON = () => {
    downloadBlob(
      `asignaciones_${empresa}_${monthValue}.json`,
      JSON.stringify(assignments, null, 2),
      "application/json;charset=utf-8"
    );
  };

  const printView = () => {
    window.print();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-5">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">
          Asignaciones generadas
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Consulta asignaciones guardadas para ver, descargar o revisar.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-3">
        <Card shadow="none" className="border border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Seleccionar asignación
            </h2>
          </CardHeader>

          <CardBody className="space-y-3">
            <Select
              label="Empresa"
              selectedKeys={empresa ? new Set([empresa]) : new Set([])}
              onSelectionChange={(keys) => {
                const selected = selectionToArray(keys)[0] || "";
                setEmpresa(selected);
              }}
              variant="bordered"
            >
              {availableCompanies.map((company) => (
                <SelectItem key={company}>{company}</SelectItem>
              ))}
            </Select>

            <Select
              label="Mes"
              selectedKeys={monthValue ? new Set([monthValue]) : new Set([])}
              onSelectionChange={(keys) => {
                const selected = selectionToArray(keys)[0] || "";
                setMonthValue(selected);
              }}
              variant="bordered"
            >
              {[
                nextMonthValue(),
                currentMonthValue(),
                "2026-05",
                "2026-04",
                "2026-03",
                "2026-02",
                "2026-01",
              ].map((month) => (
                <SelectItem key={month}>{monthLabel(month)}</SelectItem>
              ))}
            </Select>

            <Button
              color="primary"
              className="w-full font-semibold"
              startContent={!isLoading ? <RefreshCw size={18} /> : null}
              isLoading={isLoading}
              onPress={loadAssignments}
            >
              Ver asignación
            </Button>
          </CardBody>
        </Card>

        {errorMessage ? (
          <Card shadow="none" className="border border-danger-200 bg-danger-50">
            <CardBody className="text-sm text-danger-700">
              {errorMessage}
            </CardBody>
          </Card>
        ) : null}

        <Card
          shadow="none"
          className={
            assignments.length > 0
              ? "border border-success-200 bg-success-50"
              : "border border-slate-200 bg-white"
          }
        >
          <CardBody>
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Spinner size="sm" />
                Cargando asignación...
              </div>
            ) : assignments.length > 0 ? (
              <div className="flex items-start gap-3 text-success-700">
                <CheckCircle2 size={22} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-bold">Asignación disponible</p>
                  <p className="mt-1 text-sm">
                    {monthLabel(monthValue)} · {empresa}
                  </p>
                  <p className="text-sm text-success-700">
                    {assignments.length} registros encontrados.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-slate-500">
                <Inbox size={22} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-bold text-slate-800">
                    No hay asignación generada
                  </p>
                  <p className="mt-1 text-sm">
                    Primero genera y guarda la asignación del mes seleccionado.
                  </p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card shadow="none" className="border border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Resumen de la asignación
            </h2>
          </CardHeader>

          <CardBody className="space-y-3 text-sm">
            <SummaryRow label="Registros" value={stats.total} />
            <SummaryRow label="Sectores asignados" value={stats.sectors} />
            <SummaryRow label="Rutas" value={stats.routes} />
            <SummaryRow label="Lectores involucrados" value={stats.workers} />
            <SummaryRow label="Lecturas" value={stats.lectura} />
            <SummaryRow label="Repartos" value={stats.reparto} />
          </CardBody>
        </Card>

        <Card shadow="none" className="border border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Descargar asignación
            </h2>
          </CardHeader>

          <CardBody className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="flat"
              startContent={<FileText size={18} />}
              isDisabled={assignments.length === 0}
              onPress={printView}
            >
              Imprimir / guardar PDF
            </Button>

            <Button
              className="w-full justify-start"
              variant="flat"
              startContent={<FileSpreadsheet size={18} />}
              isDisabled={assignments.length === 0}
              onPress={downloadCSV}
            >
              Descargar CSV
            </Button>

            <Button
              className="w-full justify-start"
              variant="flat"
              startContent={<Download size={18} />}
              isDisabled={assignments.length === 0}
              onPress={downloadJSON}
            >
              Descargar JSON
            </Button>
          </CardBody>
        </Card>

        <Card shadow="none" className="border border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center gap-2">
              <History size={18} />
              <h2 className="text-base font-bold text-slate-900">
                Historial rápido
              </h2>
            </div>
          </CardHeader>

          <CardBody className="space-y-3 text-sm">
            {["2026-05", "2026-04", "2026-03"].map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => setMonthValue(month)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {monthLabel(month)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Revisar asignación generada
                  </p>
                </div>

                <Chip size="sm" variant="flat" color="primary">
                  Ver
                </Chip>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}