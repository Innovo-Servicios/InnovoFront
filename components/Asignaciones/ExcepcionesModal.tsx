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
  empresa?: string;
}

export type ExceptionType =
  | "vacaciones"
  | "licencia"
  | "lesion"
  | "reemplazo"
  | "apoyo"
  | "otro";

export interface AssignmentExceptionRule {
  id: string;
  tipo: ExceptionType;
  trabajadorAfectadoId: string;
  trabajadorReemplazoId?: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  observacion?: string;
}

interface ExcepcionesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;

  empresa: string;
  targetMonth: string;
  mode?: "creacion" | "modificacion";

  catalogWorkers: CatalogWorker[];

  exceptions: AssignmentExceptionRule[];
  onExceptionsChange: (exceptions: AssignmentExceptionRule[]) => void;
}

const EXCEPTION_TYPES: Array<{ key: ExceptionType; label: string }> = [
  { key: "vacaciones", label: "Vacaciones" },
  { key: "licencia", label: "Licencia médica" },
  { key: "lesion", label: "Lesión" },
  { key: "reemplazo", label: "Reemplazo puntual" },
  { key: "apoyo", label: "Apoyo adicional" },
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
  return [
    ...(worker.empresas_trabajador || []),
    ...(worker.empresasTrabajador || []),
    ...(worker.empresas || []),
    ...(worker.empresa ? [worker.empresa] : []),
  ];
};

const workerBelongsToEmpresa = (worker: CatalogWorker, empresa: string) => {
  if (!empresa) return true;

  const empresas = getWorkerCompanies(worker);

  /*
    Mientras backend no mande empresas_trabajador en todos los trabajadores,
    no bloqueamos al trabajador si no trae empresa.
    Cuando venga el dato, este mismo filtro separará bien.
  */
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

const getMonthBounds = (monthValue: string) => {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) {
    const today = new Date();
    const fallbackYear = today.getFullYear();
    const fallbackMonth = today.getMonth() + 1;
    const lastDay = new Date(fallbackYear, fallbackMonth, 0).getDate();

    return {
      firstDay: `${fallbackYear}-${String(fallbackMonth).padStart(
        2,
        "0"
      )}-01`,
      lastDay: `${fallbackYear}-${String(fallbackMonth).padStart(
        2,
        "0"
      )}-${String(lastDay).padStart(2, "0")}`,
      label: `${String(fallbackMonth).padStart(2, "0")}/${fallbackYear}`,
    };
  }

  const lastDay = new Date(year, month, 0).getDate();

  return {
    firstDay: `${year}-${String(month).padStart(2, "0")}-01`,
    lastDay: `${year}-${String(month).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`,
    label: `${String(month).padStart(2, "0")}/${year}`,
  };
};

const formatDateForDisplay = (dateValue: string) => {
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-");

  return `${day}/${month}/${year}`;
};

export default function ExcepcionesModal({
  isOpen,
  onOpenChange,
  empresa,
  targetMonth,
  mode = "creacion",
  catalogWorkers,
  exceptions,
  onExceptionsChange,
}: ExcepcionesModalProps) {
  const monthBounds = useMemo(() => getMonthBounds(targetMonth), [targetMonth]);

  const [tipo, setTipo] = useState<ExceptionType>("vacaciones");
  const [trabajadorAfectadoId, setTrabajadorAfectadoId] = useState("");
  const [trabajadorReemplazoId, setTrabajadorReemplazoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(monthBounds.firstDay);
  const [fechaFin, setFechaFin] = useState(monthBounds.lastDay);
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");

  const filteredWorkers = useMemo(() => {
    return catalogWorkers.filter((worker) =>
      workerBelongsToEmpresa(worker, empresa)
    );
  }, [catalogWorkers, empresa]);

  const readers = useMemo(() => {
    return filteredWorkers.filter((worker) => workerHasCargo(worker, "lector"));
  }, [filteredWorkers]);

  const workerById = useMemo(() => {
    return new Map(filteredWorkers.map((worker) => [worker.id, worker]));
  }, [filteredWorkers]);

  const requiresReplacement = tipo !== "apoyo" && tipo !== "otro";

  const isInvalidDateRange = Boolean(
    fechaInicio && fechaFin && fechaFin < fechaInicio
  );

  const isOutsideTargetMonth = Boolean(
    fechaInicio &&
      fechaFin &&
      (fechaInicio < monthBounds.firstDay || fechaFin > monthBounds.lastDay)
  );

  const canAddException =
    Boolean(tipo) &&
    Boolean(trabajadorAfectadoId) &&
    Boolean(fechaInicio) &&
    Boolean(fechaFin) &&
    !isInvalidDateRange &&
    !isOutsideTargetMonth &&
    (!requiresReplacement || Boolean(trabajadorReemplazoId)) &&
    trabajadorAfectadoId !== trabajadorReemplazoId;

  useEffect(() => {
    if (!isOpen) return;

    const bounds = getMonthBounds(targetMonth);

    setTipo("vacaciones");
    setTrabajadorAfectadoId("");
    setTrabajadorReemplazoId("");
    setFechaInicio(bounds.firstDay);
    setFechaFin(bounds.lastDay);
    setMotivo("");
    setObservacion("");
  }, [isOpen, targetMonth]);

  const addException = () => {
    if (!canAddException) return;

    const selectedTypeLabel =
      EXCEPTION_TYPES.find((item) => item.key === tipo)?.label || tipo;

    const nextException: AssignmentExceptionRule = {
      id: createId(),
      tipo,
      trabajadorAfectadoId,
      trabajadorReemplazoId:
        tipo === "apoyo" || tipo === "otro"
          ? trabajadorReemplazoId || undefined
          : trabajadorReemplazoId,
      fechaInicio,
      fechaFin,
      motivo: motivo.trim() || selectedTypeLabel,
      observacion: observacion.trim() || undefined,
    };

    onExceptionsChange([...exceptions, nextException]);

    setTrabajadorAfectadoId("");
    setTrabajadorReemplazoId("");
    setMotivo("");
    setObservacion("");
  };

  const removeException = (exceptionId: string) => {
    onExceptionsChange(
      exceptions.filter((exception) => exception.id !== exceptionId)
    );
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
                <span>
                  {mode === "modificacion"
                    ? "Modificación puntual de asignación"
                    : "Excepciones del mes"}
                </span>
              </div>

              <p className="text-sm font-normal text-slate-500">
                {mode === "modificacion"
                  ? "Registra cambios puntuales sobre una asignación ya guardada. No se regenera el mes completo."
                  : "Registra vacaciones, licencias, reemplazos o apoyos que deben considerarse al generar este mes."}
              </p>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="mt-0.5 shrink-0" />

                    <div>
                      <p className="font-semibold">
                        Mes afectado: {monthBounds.label}
                      </p>

                      <p className="mt-1">
                        Las fechas deben estar entre{" "}
                        <strong>{formatDateForDisplay(monthBounds.firstDay)}</strong>{" "}
                        y{" "}
                        <strong>{formatDateForDisplay(monthBounds.lastDay)}</strong>.
                      </p>

                      <p className="mt-1">
                        Estas excepciones no modifican las reglas permanentes.
                        Solo afectan esta asignación.
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
                          Nueva excepción
                        </h2>

                        <p className="text-sm text-slate-500">
                          Define el caso, el trabajador afectado, el reemplazo y
                          el rango de fechas dentro del mes seleccionado.
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Select
                        label="Tipo de excepción"
                        selectedKeys={new Set([tipo])}
                        onSelectionChange={(keys) => {
                          const selected = selectionToArray(keys)[0] as
                            | ExceptionType
                            | undefined;

                          if (!selected) return;

                          setTipo(selected);

                          if (selected === "apoyo" || selected === "otro") {
                            setTrabajadorReemplazoId("");
                          }
                        }}
                        variant="bordered"
                      >
                        {EXCEPTION_TYPES.map((item) => (
                          <SelectItem
                            key={item.key}
                            classNames={selectedItemClassNames}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Trabajador afectado"
                        placeholder="Selecciona lector"
                        selectedKeys={
                          trabajadorAfectadoId
                            ? new Set([trabajadorAfectadoId])
                            : new Set([])
                        }
                        onSelectionChange={(keys) =>
                          setTrabajadorAfectadoId(
                            selectionToArray(keys)[0] || ""
                          )
                        }
                        variant="bordered"
                      >
                        {readers.map((worker) => (
                          <SelectItem
                            key={worker.id}
                            classNames={selectedItemClassNames}
                          >
                            {worker.nombre}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label={
                          tipo === "apoyo"
                            ? "Trabajador de apoyo"
                            : "Trabajador reemplazo"
                        }
                        placeholder={
                          tipo === "apoyo"
                            ? "Opcional"
                            : "Selecciona reemplazo"
                        }
                        selectedKeys={
                          trabajadorReemplazoId
                            ? new Set([trabajadorReemplazoId])
                            : new Set([])
                        }
                        onSelectionChange={(keys) =>
                          setTrabajadorReemplazoId(
                            selectionToArray(keys)[0] || ""
                          )
                        }
                        variant="bordered"
                      >
                        {readers
                          .filter((worker) => worker.id !== trabajadorAfectadoId)
                          .map((worker) => (
                            <SelectItem
                              key={worker.id}
                              classNames={selectedItemClassNames}
                            >
                              {worker.nombre}
                            </SelectItem>
                          ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Input
                        label="Desde"
                        type="date"
                        value={fechaInicio}
                        min={monthBounds.firstDay}
                        max={monthBounds.lastDay}
                        onValueChange={setFechaInicio}
                        variant="bordered"
                        isInvalid={isInvalidDateRange || isOutsideTargetMonth}
                      />

                      <Input
                        label="Hasta"
                        type="date"
                        value={fechaFin}
                        min={monthBounds.firstDay}
                        max={monthBounds.lastDay}
                        onValueChange={setFechaFin}
                        variant="bordered"
                        isInvalid={isInvalidDateRange || isOutsideTargetMonth}
                        errorMessage={
                          isInvalidDateRange
                            ? "La fecha final no puede ser anterior a la inicial."
                            : isOutsideTargetMonth
                            ? "Las fechas deben estar dentro del mes seleccionado."
                            : ""
                        }
                      />
                    </div>

                    <Input
                      label="Motivo"
                      placeholder="Ej: vacaciones programadas, licencia médica, emergencia"
                      value={motivo}
                      onValueChange={setMotivo}
                      variant="bordered"
                    />

                    <Input
                      label="Observación"
                      placeholder="Comentario opcional"
                      value={observacion}
                      onValueChange={setObservacion}
                      variant="bordered"
                    />

                    {trabajadorAfectadoId === trabajadorReemplazoId &&
                    trabajadorAfectadoId ? (
                      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={20}
                            className="mt-0.5 shrink-0"
                          />

                          <p>
                            El trabajador afectado no puede ser su propio
                            reemplazo.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {isOutsideTargetMonth ? (
                      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={20}
                            className="mt-0.5 shrink-0"
                          />

                          <p>
                            Esta excepción debe quedar dentro del mes{" "}
                            {monthBounds.label}.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <Button
                      color="primary"
                      variant="flat"
                      startContent={<Plus size={18} />}
                      isDisabled={!canAddException}
                      onPress={addException}
                    >
                      Agregar excepción
                    </Button>
                  </CardBody>
                </Card>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Excepciones registradas
                      </h2>

                      <p className="text-sm text-slate-500">
                        Estas excepciones se aplicarán sobre la asignación del
                        mes seleccionado.
                      </p>
                    </div>
                  </CardHeader>

                  <CardBody>
                    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
                      {exceptions.length > 0 ? (
                        exceptions.map((exception) => {
                          const affectedWorker = workerById.get(
                            exception.trabajadorAfectadoId
                          );

                          const replacementWorker =
                            exception.trabajadorReemplazoId
                              ? workerById.get(exception.trabajadorReemplazoId)
                              : null;

                          const typeLabel =
                            EXCEPTION_TYPES.find(
                              (item) => item.key === exception.tipo
                            )?.label || exception.tipo;

                          return (
                            <div
                              key={exception.id}
                              className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Chip
                                      size="sm"
                                      color={
                                        exception.tipo === "apoyo"
                                          ? "success"
                                          : "danger"
                                      }
                                      variant="flat"
                                    >
                                      {typeLabel}
                                    </Chip>

                                    <span className="text-xs font-semibold text-slate-500">
                                      {formatDateForDisplay(
                                        exception.fechaInicio
                                      )}{" "}
                                      →{" "}
                                      {formatDateForDisplay(exception.fechaFin)}
                                    </span>
                                  </div>

                                  <p className="mt-2 font-semibold text-slate-900">
                                    {affectedWorker?.nombre ||
                                      "Trabajador afectado"}
                                  </p>

                                  {replacementWorker ? (
                                    <p className="mt-1 text-slate-600">
                                      Reemplazo/apoyo:{" "}
                                      <strong>
                                        {replacementWorker.nombre}
                                      </strong>
                                    </p>
                                  ) : null}

                                  <p className="mt-1 text-slate-500">
                                    Motivo: {exception.motivo}
                                  </p>

                                  {exception.observacion ? (
                                    <p className="mt-1 text-xs text-slate-400">
                                      {exception.observacion}
                                    </p>
                                  ) : null}
                                </div>

                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  startContent={<Trash2 size={16} />}
                                  onPress={() =>
                                    removeException(exception.id)
                                  }
                                >
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          No hay excepciones registradas.
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
                Aplicar excepciones
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}