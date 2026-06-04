"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import {
  CalendarDays,
  CheckCircle2,
  Dice5,
  Lock,
  Save,
  Shuffle,
  Users,
} from "lucide-react";

import {
  confirmAssignmentCreator,
  getAssignmentCreatorCatalog,
  getAssignmentCreatorTemplate,
  previewAssignmentCreator,
  saveAssignmentCreatorTemplate,
} from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";

type AssignmentType = "lectura" | "reparto";
type ConflictChoice = "keep" | "replace";

interface CatalogRoute {
  id: string;
  numero: number | null;
  sectores: number;
}

interface CatalogSector {
  id: string;
  nombre: string;
  numero: number | null;
  empresa: string;
  rutaId: string | null;
  rutaNumero: number | null;
}

interface CatalogWorker {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
}

interface CreatorCatalog {
  empresas: string[];
  rutas: CatalogRoute[];
  sectores: CatalogSector[];
  trabajadores: CatalogWorker[];
}

interface FixedAssignmentRule {
  trabajadorId: string;
  sectorId: string;
  tipos: AssignmentType[];
}

interface LeftoverWorkerRule {
  trabajadorId: string;
  tipos: AssignmentType[];
}

interface RestrictionRule {
  trabajadorId: string;
  sectorIds: string[];
}

interface CreatorTemplate {
  empresa?: string;
  fixedAssignments: FixedAssignmentRule[];
  rotating: {
    trabajadorIds: string[];
    rutaIds: string[];
    sectorIds: string[];
    tipos: AssignmentType[];
  };
  leftoverWorkers: LeftoverWorkerRule[];
  restrictions: RestrictionRule[];
}

interface RouteDay {
  rutaId: string;
  rutaNumero: number | null;
  lectura: string;
  reparto: string;
}

interface PreviewAssignment {
  key: string;
  fecha: string;
  tipo: AssignmentType;
  source: "fija" | "rotativa" | "restante";
  trabajador: CatalogWorker;
  sector: CatalogSector;
  conflicto: null | {
    asignacionId: string;
    trabajador: CatalogWorker;
    apoyo: boolean;
  };
}

interface AssignmentPreview {
  resumen: {
    total: number;
    nuevas: number;
    conflictos: number;
    omitidas: number;
    lectura: number;
    reparto: number;
  };
  porTrabajador: Array<{
    trabajador: CatalogWorker;
    total: number;
    lectura: number;
    reparto: number;
    fija: number;
    rotativa: number;
    restante: number;
  }>;
  asignaciones: PreviewAssignment[];
  omitidas: Array<{
    sector: CatalogSector;
    tipo: AssignmentType;
    reason: string;
  }>;
}

const ASSIGNMENT_TYPES: AssignmentType[] = ["lectura", "reparto"];

const emptyTemplate = (): CreatorTemplate => ({
  fixedAssignments: [],
  rotating: {
    trabajadorIds: [],
    rutaIds: [],
    sectorIds: [],
    tipos: [...ASSIGNMENT_TYPES],
  },
  leftoverWorkers: [],
  restrictions: [],
});

const currentMonthValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

const selectionToArray = (keys: unknown, allValues: string[] = []) => {
  if (keys === "all") return allValues;
  return Array.from(keys as Iterable<unknown>).map(String);
};

const parseJsonResponse = async (response: Response, fallbackMessage: string) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = Array.isArray(data?.errors) ? ` ${data.errors.join(" ")}` : "";
    throw new Error(`${data?.message || fallbackMessage}${detail}`);
  }
  return data;
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const sourceLabel = (source: PreviewAssignment["source"]) => {
  if (source === "fija") return "Fija";
  if (source === "rotativa") return "Rotativa";
  return "Restante";
};

interface AssignmentCreatorProps {
  onSaved?: () => void;
}

export default function AssignmentCreator({ onSaved }: AssignmentCreatorProps) {
  const { token, authenticatedFetch } = useAuth();
  const [catalog, setCatalog] = useState<CreatorCatalog>({
    empresas: [],
    rutas: [],
    sectores: [],
    trabajadores: [],
  });
  const [empresa, setEmpresa] = useState("");
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [template, setTemplate] = useState<CreatorTemplate>(emptyTemplate);
  const [routeDays, setRouteDays] = useState<Record<string, RouteDay>>({});
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [conflictChoices, setConflictChoices] = useState<Record<string, ConflictChoice>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [fixedWorker, setFixedWorker] = useState("");
  const [fixedSector, setFixedSector] = useState("");
  const [fixedTypes, setFixedTypes] = useState<AssignmentType[]>([...ASSIGNMENT_TYPES]);
  const [restrictionWorker, setRestrictionWorker] = useState("");
  const [restrictionSectors, setRestrictionSectors] = useState<string[]>([]);
  const [leftoverTypes, setLeftoverTypes] = useState<AssignmentType[]>([...ASSIGNMENT_TYPES]);

  const sectorById = useMemo(
    () => new Map(catalog.sectores.map((sector) => [sector.id, sector])),
    [catalog.sectores],
  );
  const workerById = useMemo(
    () => new Map(catalog.trabajadores.map((worker) => [worker.id, worker])),
    [catalog.trabajadores],
  );

  const monthBounds = useMemo(() => {
    const [yearText, monthText] = monthValue.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const start = `${yearText}-${monthText}-01`;
    const endDate = new Date(year, month, 0).getDate();
    return { start, end: `${yearText}-${monthText}-${String(endDate).padStart(2, "0")}` };
  }, [monthValue]);

  const loadCatalog = useCallback(async (selectedEmpresa?: string) => {
    if (!token) return;
    setIsLoadingCatalog(true);
    setErrorMessage(null);
    try {
      const response = await getAssignmentCreatorCatalog(token, selectedEmpresa, authenticatedFetch);
      const data = await parseJsonResponse(response, "No se pudo cargar el catálogo.");
      setCatalog(data);
      setRouteDays((current) => {
        const next: Record<string, RouteDay> = {};
        for (const route of data.rutas as CatalogRoute[]) {
          next[route.id] = {
            rutaId: route.id,
            rutaNumero: route.numero,
            lectura: current[route.id]?.lectura || "",
            reparto: current[route.id]?.reparto || "",
          };
        }
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el catálogo.");
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [authenticatedFetch, token]);

  const loadTemplate = useCallback(async (selectedEmpresa: string) => {
    if (!token || !selectedEmpresa) return;
    try {
      const response = await getAssignmentCreatorTemplate(token, selectedEmpresa, authenticatedFetch);
      const data = await parseJsonResponse(response, "No se pudo cargar la plantilla.");
      const nextTemplate = data.plantilla || emptyTemplate();
      setTemplate(nextTemplate);
      setLeftoverTypes(nextTemplate.leftoverWorkers?.[0]?.tipos?.length
        ? nextTemplate.leftoverWorkers[0].tipos
        : [...ASSIGNMENT_TYPES]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la plantilla.");
      setTemplate(emptyTemplate());
    }
  }, [authenticatedFetch, token]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!empresa && catalog.empresas.length > 0) {
      setEmpresa(catalog.empresas[0]);
    }
  }, [catalog.empresas, empresa]);

  useEffect(() => {
    if (!empresa) return;
    setPreview(null);
    setConflictChoices({});
    loadCatalog(empresa);
    loadTemplate(empresa);
  }, [empresa, loadCatalog, loadTemplate]);

  const setRouteDate = (routeId: string, tipo: AssignmentType, value: string) => {
    setRouteDays((current) => ({
      ...current,
      [routeId]: {
        ...current[routeId],
        [tipo]: value,
      },
    }));
    setPreview(null);
    setConflictChoices({});
  };

  const updateTemplate = (updater: (current: CreatorTemplate) => CreatorTemplate) => {
    setTemplate((current) => updater(current));
    setPreview(null);
    setConflictChoices({});
  };

  const addFixedAssignment = () => {
    if (!fixedWorker || !fixedSector) {
      setErrorMessage("Selecciona trabajador y sector para agregar un fijo.");
      return;
    }
    updateTemplate((current) => ({
      ...current,
      fixedAssignments: [
        ...current.fixedAssignments.filter((rule) => rule.sectorId !== fixedSector),
        { trabajadorId: fixedWorker, sectorId: fixedSector, tipos: fixedTypes.length ? fixedTypes : [...ASSIGNMENT_TYPES] },
      ],
    }));
    setFixedSector("");
    setStatusMessage("Fijo agregado a la plantilla local.");
    setErrorMessage(null);
  };

  const removeFixedAssignment = (index: number) => {
    updateTemplate((current) => ({
      ...current,
      fixedAssignments: current.fixedAssignments.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addRestriction = () => {
    if (!restrictionWorker || restrictionSectors.length === 0) {
      setErrorMessage("Selecciona trabajador y al menos un sector bloqueado.");
      return;
    }
    updateTemplate((current) => ({
      ...current,
      restrictions: [
        ...current.restrictions.filter((rule) => rule.trabajadorId !== restrictionWorker),
        { trabajadorId: restrictionWorker, sectorIds: restrictionSectors },
      ],
    }));
    setRestrictionSectors([]);
    setStatusMessage("Restricción agregada a la plantilla local.");
    setErrorMessage(null);
  };

  const removeRestriction = (index: number) => {
    updateTemplate((current) => ({
      ...current,
      restrictions: current.restrictions.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateLeftoverWorkers = (workerIds: string[]) => {
    updateTemplate((current) => ({
      ...current,
      leftoverWorkers: workerIds.map((trabajadorId) => ({
        trabajadorId,
        tipos: leftoverTypes.length ? leftoverTypes : [...ASSIGNMENT_TYPES],
      })),
    }));
  };

  const updateLeftoverTypes = (tipos: AssignmentType[]) => {
    const nextTypes = tipos.length ? tipos : [...ASSIGNMENT_TYPES];
    setLeftoverTypes(nextTypes);
    updateTemplate((current) => ({
      ...current,
      leftoverWorkers: current.leftoverWorkers.map((worker) => ({ ...worker, tipos: nextTypes })),
    }));
  };

  const saveTemplate = async () => {
    if (!token || !empresa) return;
    setIsSavingTemplate(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await saveAssignmentCreatorTemplate(token, empresa, template, authenticatedFetch);
      const data = await parseJsonResponse(response, "No se pudo guardar la plantilla.");
      setTemplate(data.plantilla || template);
      setStatusMessage(data.message || "Plantilla guardada correctamente.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la plantilla.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const buildPreviewPayload = () => {
    const [yearText, monthText] = monthValue.split("-");
    return {
      empresa,
      year: Number(yearText),
      month: Number(monthText),
      routeDays: Object.values(routeDays),
      template,
    };
  };

  const generatePreview = async () => {
    if (!token || !empresa) return;
    setIsPreviewing(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await previewAssignmentCreator(token, buildPreviewPayload(), authenticatedFetch);
      const data = await parseJsonResponse(response, "No se pudo generar la previsualización.");
      setPreview(data);
      setConflictChoices({});
      setStatusMessage("Previsualización generada. Queda bloqueada hasta Regenerar o Guardar.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo generar la previsualización.");
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const confirmPreview = async () => {
    if (!token || !empresa || !preview) return;
    setIsConfirming(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await confirmAssignmentCreator(token, {
        empresa,
        asignaciones: preview.asignaciones
          .filter((assignment) => assignment.sector.id && assignment.trabajador.id)
          .map((assignment) => ({
            key: assignment.key,
            fecha: assignment.fecha,
            tipo: assignment.tipo,
            source: assignment.source,
            sectorId: assignment.sector.id,
            trabajadorId: assignment.trabajador.id,
          })),
        conflictResolutions: conflictChoices,
      }, authenticatedFetch);
      const data = await parseJsonResponse(response, "No se pudieron guardar las asignaciones.");
      setStatusMessage(data.message || "Asignaciones guardadas correctamente.");
      setPreview(null);
      setConflictChoices({});
      onSaved?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron guardar las asignaciones.");
    } finally {
      setIsConfirming(false);
    }
  };

  const conflictRows = preview?.asignaciones.filter((assignment) => assignment.conflicto) ?? [];
  const unresolvedConflicts = conflictRows.filter((assignment) => !conflictChoices[assignment.key]).length;
  const canConfirm = Boolean(preview && preview.asignaciones.length > 0 && unresolvedConflicts === 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <Select
            label="Empresa"
            selectedKeys={empresa ? new Set([empresa]) : new Set([])}
            onSelectionChange={(keys) => {
              const nextEmpresa = selectionToArray(keys)[0] || "";
              setEmpresa(nextEmpresa);
            }}
            isDisabled={isLoadingCatalog}
            variant="bordered"
          >
            {catalog.empresas.map((item) => (
              <SelectItem key={item}>{item}</SelectItem>
            ))}
          </Select>
          <Input
            label="Mes"
            type="month"
            value={monthValue}
            onValueChange={(value) => {
              setMonthValue(value);
              setPreview(null);
              setConflictChoices({});
            }}
            variant="bordered"
          />
          <Button
            className="h-14 self-end"
            variant="flat"
            startContent={<Save size={18} />}
            isLoading={isSavingTemplate}
            isDisabled={!empresa || isSavingTemplate}
            onPress={saveTemplate}
          >
            Guardar plantilla
          </Button>
          <Button
            className="h-14 self-end"
            color="primary"
            startContent={!isPreviewing ? <Dice5 size={18} /> : null}
            isLoading={isPreviewing}
            isDisabled={!empresa || isPreviewing}
            onPress={generatePreview}
          >
            {preview ? "Regenerar" : "Previsualizar"}
          </Button>
        </CardBody>
      </Card>

      {statusMessage ? (
        <Card className="border border-success-200 bg-success-50">
          <CardBody className="text-sm text-success-700">{statusMessage}</CardBody>
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-danger-200 bg-danger-50">
          <CardBody className="text-sm text-danger-700">{errorMessage}</CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader className="flex items-center justify-between border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold">Días por ruta</h2>
                <p className="text-sm text-slate-500">Define lectura y reparto dentro del mes seleccionado.</p>
              </div>
              {isLoadingCatalog ? <Spinner size="sm" /> : <CalendarDays size={20} />}
            </CardHeader>
            <CardBody className="p-0">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ruta</th>
                      <th className="px-4 py-3">Sectores</th>
                      <th className="px-4 py-3">Lectura</th>
                      <th className="px-4 py-3">Reparto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.rutas.map((route) => (
                      <tr key={route.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">Ruta {route.numero ?? "N/A"}</td>
                        <td className="px-4 py-3">{route.sectores}</td>
                        <td className="px-4 py-3">
                          <Input
                            aria-label={`Lectura ruta ${route.numero}`}
                            type="date"
                            size="sm"
                            min={monthBounds.start}
                            max={monthBounds.end}
                            value={routeDays[route.id]?.lectura || ""}
                            onValueChange={(value) => setRouteDate(route.id, "lectura", value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            aria-label={`Reparto ruta ${route.numero}`}
                            type="date"
                            size="sm"
                            min={monthBounds.start}
                            max={monthBounds.end}
                            value={routeDays[route.id]?.reparto || ""}
                            onValueChange={(value) => setRouteDate(route.id, "reparto", value)}
                          />
                        </td>
                      </tr>
                    ))}
                    {!isLoadingCatalog && catalog.rutas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          Selecciona una empresa con rutas configuradas.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold">Grupos y restricciones</h2>
                <p className="text-sm text-slate-500">Los grupos son separados; un trabajador no debe repetirse en el mismo tipo.</p>
              </div>
            </CardHeader>
            <CardBody className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Fijos permanentes</h3>
                <Select
                  label="Trabajador fijo"
                  selectedKeys={fixedWorker ? new Set([fixedWorker]) : new Set([])}
                  onSelectionChange={(keys) => setFixedWorker(selectionToArray(keys)[0] || "")}
                  variant="bordered"
                >
                  {catalog.trabajadores.map((worker) => (
                    <SelectItem key={worker.id}>{worker.nombre}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Sector fijo"
                  selectedKeys={fixedSector ? new Set([fixedSector]) : new Set([])}
                  onSelectionChange={(keys) => setFixedSector(selectionToArray(keys)[0] || "")}
                  variant="bordered"
                >
                  {catalog.sectores.map((sector) => (
                    <SelectItem key={sector.id}>
                      R{sector.rutaNumero ?? "N/A"} - {sector.nombre}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Tipos"
                  selectionMode="multiple"
                  selectedKeys={new Set(fixedTypes)}
                  onSelectionChange={(keys) => setFixedTypes(selectionToArray(keys, ASSIGNMENT_TYPES) as AssignmentType[])}
                  variant="bordered"
                >
                  {ASSIGNMENT_TYPES.map((type) => (
                    <SelectItem key={type}>{type}</SelectItem>
                  ))}
                </Select>
                <Button variant="flat" onPress={addFixedAssignment}>
                  Agregar fijo
                </Button>
                <div className="flex max-h-44 flex-col gap-2 overflow-auto">
                  {template.fixedAssignments.map((rule, index) => (
                    <div key={`${rule.trabajadorId}-${rule.sectorId}-${index}`} className="rounded-lg border border-slate-200 p-2 text-sm">
                      <div className="font-medium">{workerById.get(rule.trabajadorId)?.nombre || "Trabajador"}</div>
                      <div className="text-slate-500">{sectorById.get(rule.sectorId)?.nombre || "Sector"} · {rule.tipos.join(", ")}</div>
                      <Button size="sm" variant="light" color="danger" onPress={() => removeFixedAssignment(index)}>
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Rotativos aleatorios</h3>
                <Select
                  label="Trabajadores rotativos"
                  selectionMode="multiple"
                  selectedKeys={new Set(template.rotating.trabajadorIds)}
                  onSelectionChange={(keys) => updateTemplate((current) => ({
                    ...current,
                    rotating: { ...current.rotating, trabajadorIds: selectionToArray(keys, catalog.trabajadores.map((w) => w.id)) },
                  }))}
                  variant="bordered"
                >
                  {catalog.trabajadores.map((worker) => (
                    <SelectItem key={worker.id}>{worker.nombre}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Rutas que rotan"
                  selectionMode="multiple"
                  selectedKeys={new Set(template.rotating.rutaIds)}
                  onSelectionChange={(keys) => updateTemplate((current) => ({
                    ...current,
                    rotating: { ...current.rotating, rutaIds: selectionToArray(keys, catalog.rutas.map((r) => r.id)) },
                  }))}
                  variant="bordered"
                >
                  {catalog.rutas.map((route) => (
                    <SelectItem key={route.id}>Ruta {route.numero ?? "N/A"}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Sectores que rotan"
                  selectionMode="multiple"
                  selectedKeys={new Set(template.rotating.sectorIds)}
                  onSelectionChange={(keys) => updateTemplate((current) => ({
                    ...current,
                    rotating: { ...current.rotating, sectorIds: selectionToArray(keys, catalog.sectores.map((s) => s.id)) },
                  }))}
                  variant="bordered"
                >
                  {catalog.sectores.map((sector) => (
                    <SelectItem key={sector.id}>
                      R{sector.rutaNumero ?? "N/A"} - {sector.nombre}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Tipos rotativos"
                  selectionMode="multiple"
                  selectedKeys={new Set(template.rotating.tipos)}
                  onSelectionChange={(keys) => updateTemplate((current) => ({
                    ...current,
                    rotating: { ...current.rotating, tipos: selectionToArray(keys, ASSIGNMENT_TYPES) as AssignmentType[] },
                  }))}
                  variant="bordered"
                >
                  {ASSIGNMENT_TYPES.map((type) => (
                    <SelectItem key={type}>{type}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Reparto de restantes</h3>
                <Select
                  label="Trabajadores para restantes"
                  selectionMode="multiple"
                  selectedKeys={new Set(template.leftoverWorkers.map((rule) => rule.trabajadorId))}
                  onSelectionChange={(keys) => updateLeftoverWorkers(selectionToArray(keys, catalog.trabajadores.map((w) => w.id)))}
                  variant="bordered"
                >
                  {catalog.trabajadores.map((worker) => (
                    <SelectItem key={worker.id}>{worker.nombre}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Tipos restantes"
                  selectionMode="multiple"
                  selectedKeys={new Set(leftoverTypes)}
                  onSelectionChange={(keys) => updateLeftoverTypes(selectionToArray(keys, ASSIGNMENT_TYPES) as AssignmentType[])}
                  variant="bordered"
                >
                  {ASSIGNMENT_TYPES.map((type) => (
                    <SelectItem key={type}>{type}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Sectores bloqueados</h3>
                <Select
                  label="Trabajador"
                  selectedKeys={restrictionWorker ? new Set([restrictionWorker]) : new Set([])}
                  onSelectionChange={(keys) => setRestrictionWorker(selectionToArray(keys)[0] || "")}
                  variant="bordered"
                >
                  {catalog.trabajadores.map((worker) => (
                    <SelectItem key={worker.id}>{worker.nombre}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="No puede hacer estos sectores"
                  selectionMode="multiple"
                  selectedKeys={new Set(restrictionSectors)}
                  onSelectionChange={(keys) => setRestrictionSectors(selectionToArray(keys, catalog.sectores.map((s) => s.id)))}
                  variant="bordered"
                >
                  {catalog.sectores.map((sector) => (
                    <SelectItem key={sector.id}>
                      R{sector.rutaNumero ?? "N/A"} - {sector.nombre}
                    </SelectItem>
                  ))}
                </Select>
                <Button variant="flat" onPress={addRestriction}>
                  Agregar restricción
                </Button>
                <div className="flex max-h-44 flex-col gap-2 overflow-auto">
                  {template.restrictions.map((rule, index) => (
                    <div key={`${rule.trabajadorId}-${index}`} className="rounded-lg border border-slate-200 p-2 text-sm">
                      <div className="font-medium">{workerById.get(rule.trabajadorId)?.nombre || "Trabajador"}</div>
                      <div className="text-slate-500">{rule.sectorIds.length} sectores bloqueados</div>
                      <Button size="sm" variant="light" color="danger" onPress={() => removeRestriction(index)}>
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader className="flex items-center justify-between border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold">Previsualización bloqueada</h2>
                <p className="text-sm text-slate-500">La propuesta no cambia hasta regenerar.</p>
              </div>
              <Lock size={20} />
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {preview ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <SummaryPill label="Total" value={preview.resumen.total} />
                    <SummaryPill label="Nuevas" value={preview.resumen.nuevas} />
                    <SummaryPill label="Conflictos" value={preview.resumen.conflictos} />
                    <SummaryPill label="Omitidas" value={preview.resumen.omitidas} />
                  </div>

                  {conflictRows.length > 0 ? (
                    <div className="rounded-lg border border-warning-200 bg-warning-50 p-3">
                      <div className="mb-2 font-semibold text-warning-800">
                        Conflictos por resolver ({unresolvedConflicts} pendientes)
                      </div>
                      <div className="flex max-h-48 flex-col gap-2 overflow-auto">
                        {conflictRows.map((assignment) => (
                          <div key={assignment.key} className="rounded border border-warning-200 bg-white p-2 text-sm">
                            <div className="font-medium">
                              {formatDate(assignment.fecha)} · {assignment.tipo} · {assignment.sector.nombre}
                            </div>
                            <div className="text-slate-500">
                              Existe: {assignment.conflicto?.trabajador.nombre || "Sin trabajador"} · Propuesta: {assignment.trabajador.nombre}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant={conflictChoices[assignment.key] === "keep" ? "solid" : "flat"}
                                onPress={() => setConflictChoices((current) => ({ ...current, [assignment.key]: "keep" }))}
                              >
                                Mantener existente
                              </Button>
                              <Button
                                size="sm"
                                color="warning"
                                variant={conflictChoices[assignment.key] === "replace" ? "solid" : "flat"}
                                onPress={() => setConflictChoices((current) => ({ ...current, [assignment.key]: "replace" }))}
                              >
                                Reemplazar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Sector</th>
                          <th className="px-3 py-2">Trabajador</th>
                          <th className="px-3 py-2">Origen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.asignaciones.map((assignment) => (
                          <tr key={assignment.key} className="border-t border-slate-100">
                            <td className="px-3 py-2">{formatDate(assignment.fecha)}</td>
                            <td className="px-3 py-2">{assignment.tipo}</td>
                            <td className="px-3 py-2">{assignment.sector.nombre}</td>
                            <td className="px-3 py-2">{assignment.trabajador.nombre}</td>
                            <td className="px-3 py-2">
                              <Chip size="sm" variant="flat">{sourceLabel(assignment.source)}</Chip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {preview.omitidas.length > 0 ? (
                    <>
                      <Divider />
                      <div className="text-sm">
                        <div className="mb-1 font-semibold">Omitidas</div>
                        <div className="max-h-28 overflow-auto text-slate-500">
                          {preview.omitidas.slice(0, 20).map((item, index) => (
                            <div key={`${item.sector.id}-${item.tipo}-${index}`}>
                              {item.tipo} · {item.sector.nombre}: {item.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  <Button
                    color="success"
                    startContent={!isConfirming ? <CheckCircle2 size={18} /> : null}
                    isLoading={isConfirming}
                    isDisabled={!canConfirm || isConfirming}
                    onPress={confirmPreview}
                  >
                    Guardar asignaciones
                  </Button>
                </>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-slate-500">
                  <Shuffle size={36} />
                  <p>Define plantilla y días, luego genera la previsualización mensual.</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h2 className="text-lg font-semibold">Carga propuesta</h2>
              </div>
            </CardHeader>
            <CardBody className="flex max-h-64 flex-col gap-2 overflow-auto">
              {preview?.porTrabajador.length ? preview.porTrabajador.map((item) => (
                <div key={item.trabajador.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.trabajador.nombre}</span>
                    <Chip size="sm" color="primary" variant="flat">{item.total}</Chip>
                  </div>
                  <div className="text-slate-500">
                    {item.lectura} lectura · {item.reparto} reparto · {item.fija} fija · {item.rotativa} rotativa · {item.restante} restante
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">La carga aparecerá después de previsualizar.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
