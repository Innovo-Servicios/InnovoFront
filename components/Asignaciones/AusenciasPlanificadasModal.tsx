"use client";

import { useEffect, useMemo, useState } from "react";
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
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  AlertTriangle,
  CalendarDays,
  Info,
  Plus,
  Save,
  Trash2,
  UserRoundCog,
} from "lucide-react";

interface CatalogWorker {
  id: string;
  nombre: string;
  rut: string;
  cargo: "administracion" | "lector" | "supervisor" | "inspector" | string;

  empresas_trabajador?: string[];
  empresasTrabajador?: string[];
  empresas?: string[];
  empresa?: string | string[];
}

export type PlannedAbsenceType =
  | "vacaciones"
  | "licencia"
  | "permiso"
  | "capacitacion"
  | "otro";

export interface PlannedAbsenceRule {
  id: string;
  tipo: PlannedAbsenceType;
  trabajadorId: string;
  trabajadorReemplazoId: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  observacion?: string;
}

interface AusenciasPlanificadasModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  empresa: string;
  targetMonth: string;
  catalogWorkers: CatalogWorker[];
  absences: PlannedAbsenceRule[];
  onAbsencesChange: (absences: PlannedAbsenceRule[]) => void;
}

const ABSENCE_TYPES: Array<{ key: PlannedAbsenceType; label: string }> = [
  { key: "vacaciones", label: "Vacaciones" },
  { key: "licencia", label: "Licencia médica" },
  { key: "permiso", label: "Permiso administrativo" },
  { key: "capacitacion", label: "Capacitación" },
  { key: "otro", label: "Otro" },
];

const selectedItemClassNames = {
  base:
    "rounded-lg data-[selected=true]:bg-primary-100 data-[selected=true]:text-primary-700 data-[selected=true]:font-semibold data-[hover=true]:bg-slate-100",
};

const normalizeText = (value: unknown) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getWorkerCompanies = (worker: CatalogWorker) => {
  const empresaValue = Array.isArray(worker.empresa)
    ? worker.empresa
    : worker.empresa
    ? [worker.empresa]
    : [];

  return [
    ...(worker.empresas_trabajador || []),
    ...(worker.empresasTrabajador || []),
    ...(worker.empresas || []),
    ...empresaValue,
  ];
};

const workerBelongsToEmpresa = (worker: CatalogWorker, empresa: string) => {
  if (!empresa) return true;

  const empresas = getWorkerCompanies(worker);

  if (empresas.length === 0) return true;

  return empresas.some(
    (item) => normalizeText(item) === normalizeText(empresa)
  );
};

const workerHasCargo = (worker: CatalogWorker, cargo: string) => {
  return normalizeText(worker.cargo) === normalizeText(cargo);
};

const selectionToArray = (keys: unknown) => {
  if (keys === "all") return [];

  return Array.from(keys as Iterable<unknown>).map(String);
};

const createId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getMonthStart = (monthValue: string) => {
  const [year, month] = monthValue.split("-");

  return `${year}-${month}-01`;
};

const getMonthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split("-");

  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "es-CL",
    {
      month: "long",
      year: "numeric",
    }
  );
};

const formatDate = (dateValue: string) => {
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-");

  return `${day}/${month}/${year}`;
};

const getWorkerCargoLabel = (cargo: string) => {
  const normalizedCargo = normalizeText(cargo);

  if (normalizedCargo === "lector") return "Lector";
  if (normalizedCargo === "inspector") return "Inspector";
  if (normalizedCargo === "supervisor") return "Supervisor";
  if (normalizedCargo === "administracion") return "Administración";

  return cargo || "Sin cargo";
};

const getCargoColor = (cargo: string) => {
  const normalizedCargo = normalizeText(cargo);

  if (normalizedCargo === "lector") return "primary";
  if (normalizedCargo === "inspector") return "warning";
  if (normalizedCargo === "supervisor") return "success";
  if (normalizedCargo === "administracion") return "secondary";

  return "default";
};

const getCargoOrder = (cargo: string) => {
  const normalizedCargo = normalizeText(cargo);

  if (normalizedCargo === "inspector") return 1;
  if (normalizedCargo === "supervisor") return 2;
  if (normalizedCargo === "lector") return 3;
  if (normalizedCargo === "administracion") return 4;

  return 99;
};

export default function AusenciasPlanificadasModal({
  isOpen,
  onOpenChange,
  empresa,
  targetMonth,
  catalogWorkers,
  absences,
  onAbsencesChange,
}: AusenciasPlanificadasModalProps) {
  const monthStart = useMemo(() => getMonthStart(targetMonth), [targetMonth]);
  const monthLabel = useMemo(() => getMonthLabel(targetMonth), [targetMonth]);

  const [tipo, setTipo] = useState<PlannedAbsenceType>("vacaciones");
  const [trabajadorId, setTrabajadorId] = useState("");
  const [trabajadorReemplazoId, setTrabajadorReemplazoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(monthStart);
  const [fechaFin, setFechaFin] = useState(monthStart);
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");

  /**
   * Ausente:
   * Solo lectores de la empresa seleccionada.
   */
  const companyWorkers = useMemo(() => {
    return catalogWorkers.filter((worker) =>
      workerBelongsToEmpresa(worker, empresa)
    );
  }, [catalogWorkers, empresa]);

  const absentReaders = useMemo(() => {
    return companyWorkers
      .filter((worker) => workerHasCargo(worker, "lector"))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [companyWorkers]);

  /**
   * Reemplazo:
   * TODOS los trabajadores del catálogo, sin filtrar por empresa.
   * Incluye inspectores, supervisores, administración y lectores.
   */
  const replacementWorkers = useMemo(() => {
    return catalogWorkers
      .filter((worker) => worker.id !== trabajadorId)
      .sort((a, b) => {
        const cargoDiff = getCargoOrder(a.cargo) - getCargoOrder(b.cargo);

        if (cargoDiff !== 0) return cargoDiff;

        return a.nombre.localeCompare(b.nombre);
      });
  }, [catalogWorkers, trabajadorId]);

  const workerById = useMemo(() => {
    return new Map(catalogWorkers.map((worker) => [worker.id, worker]));
  }, [catalogWorkers]);

  const selectedAbsentWorker = workerById.get(trabajadorId);
  const selectedReplacementWorker = workerById.get(trabajadorReemplazoId);

  const isInvalidDateRange = Boolean(
    fechaInicio && fechaFin && fechaFin < fechaInicio
  );

  const isBeforeTargetMonth = Boolean(fechaInicio && fechaInicio < monthStart);

  const isSameWorker =
    Boolean(trabajadorId) &&
    Boolean(trabajadorReemplazoId) &&
    trabajadorId === trabajadorReemplazoId;

  const canAddAbsence =
    Boolean(tipo) &&
    Boolean(trabajadorId) &&
    Boolean(trabajadorReemplazoId) &&
    Boolean(fechaInicio) &&
    Boolean(fechaFin) &&
    Boolean(motivo.trim()) &&
    !isInvalidDateRange &&
    !isBeforeTargetMonth &&
    !isSameWorker;

  useEffect(() => {
    if (!isOpen) return;

    const nextMonthStart = getMonthStart(targetMonth);

    setTipo("vacaciones");
    setTrabajadorId("");
    setTrabajadorReemplazoId("");
    setFechaInicio(nextMonthStart);
    setFechaFin(nextMonthStart);
    setMotivo("");
    setObservacion("");
  }, [isOpen, targetMonth]);

  useEffect(() => {
    if (!trabajadorId) return;

    if (trabajadorId === trabajadorReemplazoId) {
      setTrabajadorReemplazoId("");
    }
  }, [trabajadorId, trabajadorReemplazoId]);

  const addAbsence = () => {
    if (!canAddAbsence) return;

    const nextAbsence: PlannedAbsenceRule = {
      id: createId(),
      tipo,
      trabajadorId,
      trabajadorReemplazoId,
      fechaInicio,
      fechaFin,
      motivo: motivo.trim(),
      observacion: observacion.trim() || undefined,
    };

    onAbsencesChange([...absences, nextAbsence]);

    setTrabajadorId("");
    setTrabajadorReemplazoId("");
    setMotivo("");
    setObservacion("");
  };

  const removeAbsence = (absenceId: string) => {
    onAbsencesChange(absences.filter((absence) => absence.id !== absenceId));
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      backdrop="blur"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <UserRoundCog size={22} className="text-primary" />
                <span>Ausencias planificadas</span>
              </div>

              <p className="text-sm font-normal text-slate-500">
                Registra vacaciones, licencias o permisos conocidos antes de
                generar la asignación.
              </p>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="mt-0.5 shrink-0" />

                    <div>
                      <p className="font-semibold">
                        Ausencias para la asignación de {monthLabel}
                      </p>

                      <p className="mt-1">
                        La fecha de inicio debe ser desde el mes que estás
                        generando. La fecha de término puede cruzar al mes
                        siguiente, por ejemplo del 31/07 al 05/08.
                      </p>

                      <p className="mt-1">
                        El trabajador ausente se toma desde los lectores de la
                        empresa seleccionada. El reemplazo puede ser cualquier
                        trabajador del sistema: inspector, supervisor,
                        administración o lector.
                      </p>
                    </div>
                  </div>
                </div>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <CalendarDays size={21} />
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Nueva ausencia
                        </h2>

                        <p className="text-sm text-slate-500">
                          Define trabajador ausente, reemplazo y rango de
                          fechas.
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Select
                        label="Tipo de ausencia"
                        selectedKeys={new Set([tipo])}
                        onSelectionChange={(keys) => {
                          const selected = selectionToArray(keys)[0] as
                            | PlannedAbsenceType
                            | undefined;

                          if (selected) setTipo(selected);
                        }}
                        variant="bordered"
                      >
                        {ABSENCE_TYPES.map((item) => (
                          <SelectItem
                            key={item.key}
                            classNames={selectedItemClassNames}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Trabajador ausente"
                        placeholder="Selecciona lector"
                        selectedKeys={
                          trabajadorId ? new Set([trabajadorId]) : new Set([])
                        }
                        renderValue={() =>
                          selectedAbsentWorker
                            ? selectedAbsentWorker.nombre
                            : "Selecciona lector"
                        }
                        onSelectionChange={(keys) =>
                          setTrabajadorId(selectionToArray(keys)[0] || "")
                        }
                        variant="bordered"
                      >
                        {absentReaders.map((worker) => (
                          <SelectItem
                            key={worker.id}
                            classNames={selectedItemClassNames}
                            textValue={worker.nombre}
                          >
                            {worker.nombre}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Reemplazo"
                        placeholder="Selecciona cualquier trabajador"
                        selectedKeys={
                          trabajadorReemplazoId
                            ? new Set([trabajadorReemplazoId])
                            : new Set([])
                        }
                        renderValue={() =>
                          selectedReplacementWorker
                            ? `${selectedReplacementWorker.nombre} · ${getWorkerCargoLabel(
                                selectedReplacementWorker.cargo
                              )}`
                            : "Selecciona reemplazo"
                        }
                        onSelectionChange={(keys) =>
                          setTrabajadorReemplazoId(
                            selectionToArray(keys)[0] || ""
                          )
                        }
                        variant="bordered"
                      >
                        {replacementWorkers.map((worker) => (
                          <SelectItem
                            key={worker.id}
                            classNames={selectedItemClassNames}
                            textValue={`${worker.nombre} ${getWorkerCargoLabel(
                              worker.cargo
                            )}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="line-clamp-2">
                                {worker.nombre}
                              </span>

                              <Chip
                                size="sm"
                                variant="flat"
                                color={getCargoColor(worker.cargo) as any}
                              >
                                {getWorkerCargoLabel(worker.cargo)}
                              </Chip>
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Input
                        label="Desde"
                        type="date"
                        value={fechaInicio}
                        min={monthStart}
                        onValueChange={setFechaInicio}
                        variant="bordered"
                        isInvalid={isInvalidDateRange || isBeforeTargetMonth}
                      />

                      <Input
                        label="Hasta"
                        type="date"
                        value={fechaFin}
                        min={fechaInicio || monthStart}
                        onValueChange={setFechaFin}
                        variant="bordered"
                        isInvalid={isInvalidDateRange}
                        errorMessage={
                          isInvalidDateRange
                            ? "La fecha final no puede ser anterior a la inicial."
                            : ""
                        }
                      />

                      <Input
                        label="Motivo"
                        placeholder="Ej: vacaciones programadas"
                        value={motivo}
                        onValueChange={setMotivo}
                        variant="bordered"
                      />
                    </div>

                    <Input
                      label="Observación"
                      placeholder="Comentario opcional"
                      value={observacion}
                      onValueChange={setObservacion}
                      variant="bordered"
                    />

                    {isBeforeTargetMonth ? (
                      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={20}
                            className="mt-0.5 shrink-0"
                          />

                          <p>
                            La ausencia no puede comenzar antes del mes que estás
                            generando.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {isSameWorker ? (
                      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={20}
                            className="mt-0.5 shrink-0"
                          />

                          <p>
                            El trabajador ausente no puede ser su propio
                            reemplazo.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <Button
                      color="primary"
                      variant="flat"
                      startContent={<Plus size={18} />}
                      isDisabled={!canAddAbsence}
                      onPress={addAbsence}
                    >
                      Agregar ausencia
                    </Button>
                  </CardBody>
                </Card>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Ausencias registradas
                      </h2>

                      <p className="text-sm text-slate-500">
                        Estas ausencias se considerarán al generar la propuesta.
                      </p>
                    </div>
                  </CardHeader>

                  <CardBody>
                    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
                      {absences.length > 0 ? (
                        absences.map((absence) => {
                          const absentWorker = workerById.get(
                            absence.trabajadorId
                          );

                          const replacementWorker = workerById.get(
                            absence.trabajadorReemplazoId
                          );

                          const typeLabel =
                            ABSENCE_TYPES.find(
                              (item) => item.key === absence.tipo
                            )?.label || absence.tipo;

                          return (
                            <div
                              key={absence.id}
                              className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Chip
                                      size="sm"
                                      color="danger"
                                      variant="flat"
                                    >
                                      {typeLabel}
                                    </Chip>

                                    <span className="text-xs font-semibold text-slate-500">
                                      {formatDate(absence.fechaInicio)} →{" "}
                                      {formatDate(absence.fechaFin)}
                                    </span>
                                  </div>

                                  <p className="mt-2 font-semibold text-slate-900">
                                    {absentWorker?.nombre ||
                                      "Trabajador ausente"}
                                  </p>

                                  <p className="mt-1 text-slate-600">
                                    Reemplazo:{" "}
                                    <strong>
                                      {replacementWorker?.nombre ||
                                        "Sin reemplazo"}
                                    </strong>
                                    {replacementWorker ? (
                                      <span className="ml-2 text-xs text-slate-400">
                                        {getWorkerCargoLabel(
                                          replacementWorker.cargo
                                        )}
                                      </span>
                                    ) : null}
                                  </p>

                                  <p className="mt-1 text-slate-500">
                                    Motivo: {absence.motivo}
                                  </p>

                                  {absence.observacion ? (
                                    <p className="mt-1 text-xs text-slate-400">
                                      {absence.observacion}
                                    </p>
                                  ) : null}
                                </div>

                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  startContent={<Trash2 size={16} />}
                                  onPress={() => removeAbsence(absence.id)}
                                >
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          No hay ausencias registradas.
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cerrar
              </Button>

              <Button
                color="primary"
                startContent={<Save size={18} />}
                onPress={onClose}
              >
                Aplicar ausencias
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}