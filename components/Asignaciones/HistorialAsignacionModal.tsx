"use client";

import {
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";

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

interface PuntualModificationRule {
  id: string;
  tipo: "apoyo" | "reemplazo" | "accidente" | "emergencia" | "otro";
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

interface HistorialAsignacionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  empresa: string;
  monthLabel: string;
  assignments: ExistingAssignmentView[];
  modifications: PuntualModificationRule[];
}

const formatDate = (dateValue: string) => {
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-");

  return `${day}/${month}/${year}`;
};

const getModificationLabel = (tipo: PuntualModificationRule["tipo"]) => {
  const labels: Record<PuntualModificationRule["tipo"], string> = {
    apoyo: "Apoyo",
    reemplazo: "Reemplazo",
    accidente: "Accidente",
    emergencia: "Emergencia",
    otro: "Otro",
  };

  return labels[tipo] || tipo;
};

export default function HistorialAsignacionModal({
  isOpen,
  onOpenChange,
  empresa,
  monthLabel,
  assignments,
  modifications,
}: HistorialAsignacionModalProps) {
  const modificationByAssignmentId = new Map(
    modifications.map((modification) => [
      modification.assignmentId,
      modification,
    ])
  );

  const sortedAssignments = [...assignments].sort((a, b) => {
    const routeA = a.sector.ruta ?? 999;
    const routeB = b.sector.ruta ?? 999;

    if (routeA !== routeB) return routeA - routeB;

    const sectorA = a.sector.numero ?? 9999;
    const sectorB = b.sector.numero ?? 9999;

    if (sectorA !== sectorB) return sectorA - sectorB;

    return a.tipo.localeCompare(b.tipo);
  });

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      backdrop="blur"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-900">
            Detalle de asignación
          </h2>

          <p className="text-sm font-normal text-slate-500">
            {empresa} · {monthLabel}
          </p>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Registros
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {assignments.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Modificaciones
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {modifications.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Estado
                </p>
                <p className="mt-1 text-sm font-semibold text-success-700">
                  Asignación disponible
                </p>
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 text-xs uppercase text-slate-700">
                  <tr className="bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100">
                    <th className="px-4 py-3 text-left font-bold">Ruta</th>
                    <th className="px-4 py-3 text-left font-bold">Sector</th>
                    <th className="px-4 py-3 text-left font-bold">Tipo</th>
                    <th className="px-4 py-3 text-left font-bold">Fecha</th>
                    <th className="px-4 py-3 text-left font-bold">
                      Trabajador original
                    </th>
                    <th className="px-4 py-3 text-left font-bold">
                      Apoyo / reemplazo
                    </th>
                    <th className="px-4 py-3 text-left font-bold">Motivo</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedAssignments.length > 0 ? (
                    sortedAssignments.map((assignment, index) => {
                      const modification = modificationByAssignmentId.get(
                        assignment.id
                      );

                      return (
                        <tr
                          key={assignment.id}
                          className={
                            index % 2 === 0
                              ? "border-t border-slate-100 bg-white"
                              : "border-t border-slate-100 bg-slate-50"
                          }
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            Ruta {assignment.sector.ruta ?? "N/A"}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {assignment.sector.nombre}
                            </p>
                            <p className="text-xs text-slate-500">
                              Sector {assignment.sector.numero ?? "N/A"}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                assignment.tipo === "lectura"
                                  ? "primary"
                                  : "success"
                              }
                            >
                              {assignment.tipo}
                            </Chip>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(assignment.fecha_asignacion)}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {assignment.trabajador.nombre}
                            </p>
                            <p className="text-xs text-slate-500">
                              {assignment.trabajador.rut}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            {modification ? (
                              <div className="space-y-1">
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={
                                    modification.tipo === "apoyo"
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {getModificationLabel(modification.tipo)}
                                </Chip>

                                <p className="font-semibold text-slate-800">
                                  {modification.trabajadorNuevoNombre}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                Sin modificación
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {modification ? (
                              <div>
                                <p>{modification.motivo}</p>
                                {modification.observacion ? (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {modification.observacion}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No hay asignaciones para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}  