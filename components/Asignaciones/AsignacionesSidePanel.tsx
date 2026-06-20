"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  FileText,
  History,
  Inbox,
  RefreshCw,
  UserRoundCog,
} from "lucide-react";

import { getVistaAsignaciones } from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";
import ModificacionPuntualModal, {
  PuntualModificationRule,
} from "@/components/Asignaciones/ModificacionPuntualModal";
import HistorialAsignacionModal from "@/components/Asignaciones/HistorialAsignacionModal";
import { downloadAuthenticatedFile } from "@/lib/authenticatedFiles";

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
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [assignments, setAssignments] = useState<ExistingAssignmentView[]>([]);
  const [modifications, setModifications] = useState<PuntualModificationRule[]>(
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModificationOpen, setIsModificationOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const availableCompanies = ["GasValpo", "Comercial"];

  const operationalStats = useMemo(() => {
    const apoyos = modifications.filter(
      (modification) => modification.tipo === "apoyo"
    ).length;

    const reemplazos = modifications.filter(
      (modification) => modification.tipo === "reemplazo"
    ).length;

    const accidentes = modifications.filter(
      (modification) => modification.tipo === "accidente"
    ).length;

    const emergencias = modifications.filter(
      (modification) => modification.tipo === "emergencia"
    ).length;

    const otros = modifications.filter(
      (modification) => modification.tipo === "otro"
    ).length;

    const affectedSectors = new Set(
      modifications.map((modification) => modification.sectorId)
    );

    return {
      hasAssignment: assignments.length > 0,
      apoyos,
      reemplazos,
      accidentes,
      emergencias,
      otros,
      totalModifications: modifications.length,
      affectedSectors: affectedSectors.size,
    };
  }, [assignments.length, modifications]);

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
      "Trabajador original",
      "RUT",
      "Empresa",
      "Modificacion",
      "Trabajador apoyo/reemplazo",
      "Motivo",
    ];

    const modificationByAssignmentId = new Map(
      modifications.map((modification) => [
        modification.assignmentId,
        modification,
      ])
    );

    const rows = assignments.map((assignment) => {
      const modification = modificationByAssignmentId.get(assignment.id);

      return [
        assignment.fecha_asignacion,
        assignment.tipo,
        assignment.sector.ruta ?? "",
        assignment.sector.nombre ?? "",
        assignment.trabajador.nombre ?? "",
        assignment.trabajador.rut ?? "",
        assignment.sector.empresa ?? "",
        modification?.tipo ?? "",
        modification?.trabajadorNuevoNombre ?? "",
        modification?.motivo ?? "",
      ];
    });

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

  const downloadPdf = async () => {
    if (!empresa || !monthValue) return;

    setIsDownloadingPdf(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        empresa,
        month: monthValue,
        zonal: "4",
      });
      await downloadAuthenticatedFile(
        authenticatedFetch,
        `/asignacion/exportar/programacion/pdf?${params}`,
        `PROGRAMACION_${empresa}_${monthValue}.pdf`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el PDF."
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const downloadExcel = async () => {
    if (!empresa || !monthValue) return;

    setIsDownloadingExcel(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        empresa,
        month: monthValue,
        zonal: "4",
      });
      await downloadAuthenticatedFile(
        authenticatedFetch,
        `/asignacion/exportar/programacion?${params}`,
        `PROGRAMACION_${empresa}_${monthValue}.xlsx`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el Excel."
      );
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-5">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">
          Asignaciones generadas
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Consulta asignaciones guardadas, revisa ajustes y descarga reportes.
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
                setModifications([]);
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
                setModifications([]);
              }}
              variant="bordered"
            >
              {[
                currentMonthValue(),
                nextMonthValue(),
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
              Gestión puntual
            </h2>
          </CardHeader>

          <CardBody className="space-y-3">
            <Button
              className="w-full justify-start font-semibold"
              variant="flat"
              color={modifications.length > 0 ? "warning" : "default"}
              startContent={<UserRoundCog size={18} />}
              isDisabled={assignments.length === 0}
              onPress={() => setIsModificationOpen(true)}
            >
              Agregar apoyo / reemplazo
              {modifications.length > 0 ? ` (${modifications.length})` : ""}
            </Button>

            <Button
              className="w-full justify-start font-semibold"
              variant="flat"
              startContent={<History size={18} />}
              isDisabled={assignments.length === 0}
              onPress={() => setIsHistoryOpen(true)}
            >
              Ver detalle de asignación
            </Button>

            <p className="text-xs text-slate-500">
              Los apoyos, reemplazos y emergencias se registran sobre una
              asignación existente. No regeneran el mes completo.
            </p>
          </CardBody>
        </Card>

        <Card shadow="none" className="border border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Estado operativo
            </h2>
          </CardHeader>

          <CardBody className="space-y-3 text-sm">
            <StatusRow
              label="Asignación cargada"
              value={operationalStats.hasAssignment ? "Sí" : "No"}
              active={operationalStats.hasAssignment}
            />

            <StatusRow
              label="Apoyos registrados"
              value={operationalStats.apoyos}
              active={operationalStats.apoyos > 0}
            />

            <StatusRow
              label="Reemplazos registrados"
              value={operationalStats.reemplazos}
              active={operationalStats.reemplazos > 0}
            />

            <StatusRow
              label="Accidentes / emergencias"
              value={operationalStats.accidentes + operationalStats.emergencias}
              active={
                operationalStats.accidentes + operationalStats.emergencias > 0
              }
            />

            <StatusRow
              label="Sectores afectados"
              value={operationalStats.affectedSectors}
              active={operationalStats.affectedSectors > 0}
            />

            <StatusRow
              label="Total modificaciones"
              value={operationalStats.totalModifications}
              active={operationalStats.totalModifications > 0}
            />
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
              color="success"
              startContent={!isDownloadingPdf ? <FileText size={18} /> : null}
              isLoading={isDownloadingPdf}
              isDisabled={assignments.length === 0}
              onPress={downloadPdf}
            >
              Imprimir / guardar PDF
            </Button>

            <Button
              className="w-full justify-start"
              variant="flat"
              color="success"
              startContent={!isDownloadingExcel ? <FileDown size={18} /> : null}
              isLoading={isDownloadingExcel}
              isDisabled={assignments.length === 0}
              onPress={downloadExcel}
            >
              Descargar Excel
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
                onClick={() => {
                  setMonthValue(month);
                  setTimeout(() => {
                    setIsHistoryOpen(true);
                  }, 150);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {monthLabel(month)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Abrir detalle de asignación
                  </p>
                </div>

                <Chip size="sm" variant="flat" color="primary">
                  Abrir
                </Chip>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      <ModificacionPuntualModal
        isOpen={isModificationOpen}
        onOpenChange={setIsModificationOpen}
        empresa={empresa}
        monthValue={monthValue}
        assignments={assignments}
        modifications={modifications}
        onModificationsChange={setModifications}
      />

      <HistorialAsignacionModal
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        empresa={empresa}
        monthLabel={monthLabel(monthValue)}
        assignments={assignments}
        modifications={modifications}
      />
    </div>
  );
}

function StatusRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string | number;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>

      <Chip
        size="sm"
        variant="flat"
        color={active ? "primary" : "default"}
      >
        {value}
      </Chip>
    </div>
  );
}
