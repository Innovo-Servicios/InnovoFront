"use client";

import { useMemo, useState } from "react";
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
  Plus,
  Save,
  Trash2,
  UserRoundCog,
} from "lucide-react";

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

export type PuntualModificationType =
  | "apoyo"
  | "reemplazo"
  | "accidente"
  | "emergencia"
  | "otro";

export interface PuntualModificationRule {
  id: string;
  tipo: PuntualModificationType;
  assignmentId: string;
  sectorId: string;
  sectorNombre: string;
  ruta: number | null;
  fecha: string;
  trabajadorActualId: string;
  trabajadorActualNombre: string;
  trabajadorNuevoId: string;
  trabajadorNuevoNombre: string;
  motivo: string;
  observacion?: string;
}

interface ModificacionPuntualModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  empresa: string;
  monthValue: string;
  assignments: ExistingAssignmentView[];
  modifications: PuntualModificationRule[];
  onModificationsChange: (modifications: PuntualModificationRule[]) => void;
}

const MODIFICATION_TYPES: Array<{
  key: PuntualModificationType;
  label: string;
}> = [
  { key: "apoyo", label: "Apoyo puntual" },
  { key: "reemplazo", label: "Reemplazo puntual" },
  { key: "accidente", label: "Accidente de trabajo" },
  { key: "emergencia", label: "Emergencia operativa" },
  { key: "otro", label: "Otro" },
];

const selectedItemClassNames = {
  base:
    "rounded-lg data-[selected=true]:bg-primary-100 data-[selected=true]:text-primary-700 data-[selected=true]:font-semibold data-[hover=true]:bg-slate-100",
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
  const lastDay = new Date(year, month, 0).getDate();

  return {
    start: `${yearText}-${monthText}-01`,
    end: `${yearText}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  };
};

const formatDate = (dateValue: string) => {
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-");

  return `${day}/${month}/${year}`;
};

export default function ModificacionPuntualModal({
  isOpen,
  onOpenChange,
  empresa,
  monthValue,
  assignments,
  modifications,
  onModificationsChange,
}: ModificacionPuntualModalProps) {
  const monthBounds = useMemo(() => getMonthBounds(monthValue), [monthValue]);

  const [tipo, setTipo] = useState<PuntualModificationType>("apoyo");
  const [ruta, setRuta] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [trabajadorNuevoId, setTrabajadorNuevoId] = useState("");
  const [fecha, setFecha] = useState(monthBounds.start);
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");

  const routes = useMemo(() => {
    return Array.from(
      new Set(
        assignments
          .map((assignment) => assignment.sector.ruta)
          .filter((item) => item !== null && item !== undefined)
          .map(String)
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [assignments]);

  const assignmentsByRoute = useMemo(() => {
    if (!ruta) return [];

    return assignments.filter(
      (assignment) =>
        String(assignment.sector.ruta) === ruta && assignment.tipo === "lectura"
    );
  }, [assignments, ruta]);

  const selectedAssignment = useMemo(() => {
    return assignments.find((assignment) => assignment.id === assignmentId);
  }, [assignments, assignmentId]);

  const workers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nombre: string; rut: string; cargo: string }
    >();

    for (const assignment of assignments) {
      if (assignment.trabajador?.id) {
        map.set(assignment.trabajador.id, assignment.trabajador);
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [assignments]);

  const isInvalidDate = Boolean(
    fecha && (fecha < monthBounds.start || fecha > monthBounds.end)
  );

  const canAdd =
    Boolean(tipo) &&
    Boolean(ruta) &&
    Boolean(assignmentId) &&
    Boolean(trabajadorNuevoId) &&
    Boolean(fecha) &&
    Boolean(motivo.trim()) &&
    !isInvalidDate &&
    selectedAssignment?.trabajador.id !== trabajadorNuevoId;

  const addModification = () => {
    if (!canAdd || !selectedAssignment) return;

    const newWorker = workers.find((worker) => worker.id === trabajadorNuevoId);

    if (!newWorker) return;

    const nextModification: PuntualModificationRule = {
      id: createId(),
      tipo,
      assignmentId: selectedAssignment.id,
      sectorId: selectedAssignment.sector.id || "",
      sectorNombre: selectedAssignment.sector.nombre,
      ruta: selectedAssignment.sector.ruta,
      fecha,
      trabajadorActualId: selectedAssignment.trabajador.id,
      trabajadorActualNombre: selectedAssignment.trabajador.nombre,
      trabajadorNuevoId: newWorker.id,
      trabajadorNuevoNombre: newWorker.nombre,
      motivo: motivo.trim(),
      observacion: observacion.trim() || undefined,
    };

    onModificationsChange([...modifications, nextModification]);

    setAssignmentId("");
    setTrabajadorNuevoId("");
    setMotivo("");
    setObservacion("");
  };

  const removeModification = (id: string) => {
    onModificationsChange(modifications.filter((item) => item.id !== id));
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
                <span>Modificación puntual</span>
              </div>

              <p className="text-sm font-normal text-slate-500">
                Registra apoyos o reemplazos sobre una asignación ya guardada.
                No se regenera el mes completo.
              </p>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-5">
                <Card shadow="none" className="border border-blue-100 bg-blue-50">
                  <CardBody className="text-sm text-blue-800">
                    <p className="font-semibold">
                      Empresa: {empresa} · Mes: {monthValue}
                    </p>
                    <p className="mt-1">
                      Este flujo es para casos operativos del mes actual o de
                      una asignación ya guardada: apoyo, accidente, reemplazo o
                      emergencia.
                    </p>
                  </CardBody>
                </Card>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <CalendarDays size={21} />
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Nuevo ajuste puntual
                        </h2>
                        <p className="text-sm text-slate-500">
                          Selecciona ruta, sector, trabajador y motivo.
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Select
                        label="Tipo"
                        selectedKeys={new Set([tipo])}
                        onSelectionChange={(keys) => {
                          const selected = selectionToArray(keys)[0] as
                            | PuntualModificationType
                            | undefined;

                          if (selected) setTipo(selected);
                        }}
                        variant="bordered"
                      >
                        {MODIFICATION_TYPES.map((item) => (
                          <SelectItem
                            key={item.key}
                            classNames={selectedItemClassNames}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Ruta"
                        placeholder="Selecciona ruta"
                        selectedKeys={ruta ? new Set([ruta]) : new Set([])}
                        onSelectionChange={(keys) => {
                          const selected = selectionToArray(keys)[0] || "";
                          setRuta(selected);
                          setAssignmentId("");
                        }}
                        variant="bordered"
                      >
                        {routes.map((route) => (
                          <SelectItem
                            key={route}
                            classNames={selectedItemClassNames}
                          >
                            Ruta {route}
                          </SelectItem>
                        ))}
                      </Select>

                      <Input
                        label="Fecha"
                        type="date"
                        min={monthBounds.start}
                        max={monthBounds.end}
                        value={fecha}
                        onValueChange={setFecha}
                        isInvalid={isInvalidDate}
                        errorMessage={
                          isInvalidDate
                            ? "La fecha debe estar dentro del mes seleccionado."
                            : ""
                        }
                        variant="bordered"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Select
                        label="Sector"
                        placeholder={
                          ruta
                            ? "Selecciona sector"
                            : "Primero selecciona ruta"
                        }
                        selectedKeys={
                          assignmentId ? new Set([assignmentId]) : new Set([])
                        }
                        onSelectionChange={(keys) =>
                          setAssignmentId(selectionToArray(keys)[0] || "")
                        }
                        isDisabled={!ruta}
                        variant="bordered"
                      >
                        {assignmentsByRoute.map((assignment) => (
                          <SelectItem
                            key={assignment.id}
                            classNames={selectedItemClassNames}
                          >
                            {assignment.sector.nombre}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Trabajador apoyo/reemplazo"
                        placeholder="Selecciona trabajador"
                        selectedKeys={
                          trabajadorNuevoId
                            ? new Set([trabajadorNuevoId])
                            : new Set([])
                        }
                        onSelectionChange={(keys) =>
                          setTrabajadorNuevoId(selectionToArray(keys)[0] || "")
                        }
                        variant="bordered"
                      >
                        {workers
                          .filter(
                            (worker) =>
                              worker.id !== selectedAssignment?.trabajador.id
                          )
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

                    {selectedAssignment ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <p className="font-semibold text-slate-800">
                          Asignación actual
                        </p>
                        <p className="mt-1 text-slate-600">
                          {selectedAssignment.sector.nombre} ·{" "}
                          {selectedAssignment.trabajador.nombre} ·{" "}
                          {formatDate(selectedAssignment.fecha_asignacion)}
                        </p>
                      </div>
                    ) : null}

                    <Input
                      label="Motivo"
                      placeholder="Ej: apoyo por sobrecarga, accidente, emergencia"
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

                    {selectedAssignment?.trabajador.id ===
                    trabajadorNuevoId ? (
                      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={20}
                            className="mt-0.5 shrink-0"
                          />
                          <p>
                            El trabajador de apoyo/reemplazo no puede ser el
                            mismo trabajador actual.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <Button
                      color="primary"
                      variant="flat"
                      startContent={<Plus size={18} />}
                      isDisabled={!canAdd}
                      onPress={addModification}
                    >
                      Agregar modificación puntual
                    </Button>
                  </CardBody>
                </Card>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Modificaciones registradas
                    </h2>
                  </CardHeader>

                  <CardBody>
                    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
                      {modifications.length > 0 ? (
                        modifications.map((modification) => {
                          const label =
                            MODIFICATION_TYPES.find(
                              (item) => item.key === modification.tipo
                            )?.label || modification.tipo;

                          return (
                            <div
                              key={modification.id}
                              className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Chip
                                      size="sm"
                                      color={
                                        modification.tipo === "apoyo"
                                          ? "success"
                                          : "warning"
                                      }
                                      variant="flat"
                                    >
                                      {label}
                                    </Chip>

                                    <span className="text-xs font-semibold text-slate-500">
                                      {formatDate(modification.fecha)}
                                    </span>
                                  </div>

                                  <p className="mt-2 font-semibold text-slate-900">
                                    Ruta {modification.ruta ?? "N/A"} ·{" "}
                                    {modification.sectorNombre}
                                  </p>

                                  <p className="mt-1 text-slate-600">
                                    {modification.trabajadorActualNombre} →{" "}
                                    <strong>
                                      {modification.trabajadorNuevoNombre}
                                    </strong>
                                  </p>

                                  <p className="mt-1 text-slate-500">
                                    Motivo: {modification.motivo}
                                  </p>

                                  {modification.observacion ? (
                                    <p className="mt-1 text-xs text-slate-400">
                                      {modification.observacion}
                                    </p>
                                  ) : null}
                                </div>

                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  startContent={<Trash2 size={16} />}
                                  onPress={() =>
                                    removeModification(modification.id)
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
                          No hay modificaciones puntuales registradas.
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
                Aplicar modificaciones
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}