"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
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
  Info,
  LockKeyhole,
  Medal,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";

type AssignmentType = "lectura" | "reparto";

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

interface RestriccionesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;

  catalogRoutes: CatalogRoute[];
  catalogWorkers: CatalogWorker[];
  catalogSectors: CatalogSector[];

  template: CreatorTemplate;

  isSavingTemplate: boolean;
  empresa: string;
  saveTemplate: (templateOverride?: CreatorTemplate) => Promise<void>;
}

const BOTH_ASSIGNMENT_TYPES: AssignmentType[] = ["lectura", "reparto"];

const selectedItemClassNames = {
  base:
    "rounded-lg data-[selected=true]:bg-primary-100 data-[selected=true]:text-primary-700 data-[selected=true]:font-semibold data-[hover=true]:bg-slate-100",
};

const cloneTemplate = (template: CreatorTemplate): CreatorTemplate => ({
  empresa: template.empresa,
  fixedAssignments: template.fixedAssignments.map((rule) => ({
    trabajadorId: rule.trabajadorId,
    sectorId: rule.sectorId,
    tipos: [...rule.tipos],
  })),
  rotating: {
    trabajadorIds: [...template.rotating.trabajadorIds],
    rutaIds: [...template.rotating.rutaIds],
    sectorIds: [...template.rotating.sectorIds],
    tipos: [...template.rotating.tipos],
  },
  leftoverWorkers: template.leftoverWorkers.map((rule) => ({
    trabajadorId: rule.trabajadorId,
    tipos: [...rule.tipos],
  })),
  restrictions: template.restrictions.map((rule) => ({
    trabajadorId: rule.trabajadorId,
    sectorIds: [...rule.sectorIds],
  })),
});

const emptyTemplate = (): CreatorTemplate => ({
  fixedAssignments: [],
  rotating: {
    trabajadorIds: [],
    rutaIds: [],
    sectorIds: [],
    tipos: [...BOTH_ASSIGNMENT_TYPES],
  },
  leftoverWorkers: [],
  restrictions: [],
});

const selectionToArray = (keys: unknown, allValues: string[] = []) => {
  if (keys === "all") return allValues;

  return Array.from(keys as Iterable<unknown>).map(String);
};

const normalizeRulesSnapshot = (template: CreatorTemplate) => {
  return JSON.stringify({
    fixedAssignments: [...template.fixedAssignments]
      .map((rule) => ({
        trabajadorId: rule.trabajadorId,
        sectorId: rule.sectorId,
        tipos: [...BOTH_ASSIGNMENT_TYPES].sort(),
      }))
      .sort((a, b) =>
        `${a.trabajadorId}-${a.sectorId}`.localeCompare(
          `${b.trabajadorId}-${b.sectorId}`
        )
      ),

    bonusWorkers: [...template.rotating.trabajadorIds].sort(),
    bonusSectors: [...template.rotating.sectorIds].sort(),
    bonusTypes: [...BOTH_ASSIGNMENT_TYPES].sort(),
  });
};

export default function RestriccionesModal({
  isOpen,
  onOpenChange,
  catalogRoutes,
  catalogWorkers,
  catalogSectors,
  template,
  isSavingTemplate,
  empresa,
  saveTemplate,
}: RestriccionesModalProps) {
  const [draftTemplate, setDraftTemplate] = useState<CreatorTemplate>(
    emptyTemplate()
  );

  const [initialRulesSnapshot, setInitialRulesSnapshot] = useState("");

  const [fixedWorker, setFixedWorker] = useState("");
  const [fixedRouteId, setFixedRouteId] = useState("");
  const [fixedSector, setFixedSector] = useState("");

  const [bonusRouteId, setBonusRouteId] = useState("");

  const workerById = useMemo(
    () => new Map(catalogWorkers.map((worker) => [worker.id, worker])),
    [catalogWorkers]
  );

  const sectorById = useMemo(
    () => new Map(catalogSectors.map((sector) => [sector.id, sector])),
    [catalogSectors]
  );

  const selectedFixedRoute = useMemo(() => {
    return catalogRoutes.find((route) => route.id === fixedRouteId) || null;
  }, [catalogRoutes, fixedRouteId]);

  const selectedBonusRoute = useMemo(() => {
    return catalogRoutes.find((route) => route.id === bonusRouteId) || null;
  }, [catalogRoutes, bonusRouteId]);

  const fixedRouteSectors = useMemo(() => {
    if (!fixedRouteId) return [];

    return catalogSectors.filter((sector) => sector.rutaId === fixedRouteId);
  }, [catalogSectors, fixedRouteId]);

  const bonusRouteSectors = useMemo(() => {
    if (!bonusRouteId) return [];

    return catalogSectors.filter((sector) => sector.rutaId === bonusRouteId);
  }, [catalogSectors, bonusRouteId]);

  const selectedBonusSectorsFromRoute = useMemo(() => {
    if (!bonusRouteId) return new Set<string>();

    const sectorIdsFromRoute = new Set(
      bonusRouteSectors.map((sector) => sector.id)
    );

    return new Set(
      draftTemplate.rotating.sectorIds.filter((sectorId) =>
        sectorIdsFromRoute.has(sectorId)
      )
    );
  }, [bonusRouteId, bonusRouteSectors, draftTemplate.rotating.sectorIds]);

  const currentRulesSnapshot = useMemo(
    () => normalizeRulesSnapshot(draftTemplate),
    [draftTemplate]
  );

  const hasRulesChanges = useMemo(() => {
    if (!initialRulesSnapshot) return false;

    return currentRulesSnapshot !== initialRulesSnapshot;
  }, [currentRulesSnapshot, initialRulesSnapshot]);

  const bonusWorkersCount = draftTemplate.rotating.trabajadorIds.length;
  const bonusSectorsCount = draftTemplate.rotating.sectorIds.length;

  const hasBonusConfiguration =
    bonusWorkersCount > 0 || bonusSectorsCount > 0;

  const hasBonusCountMismatch =
    hasBonusConfiguration && bonusWorkersCount !== bonusSectorsCount;

  const canSaveRules =
    Boolean(empresa) &&
    hasRulesChanges &&
    !isSavingTemplate &&
    !hasBonusCountMismatch;

  useEffect(() => {
    if (!isOpen) return;

    const freshDraft = cloneTemplate(template);

    freshDraft.fixedAssignments = freshDraft.fixedAssignments.map((rule) => ({
      ...rule,
      tipos: [...BOTH_ASSIGNMENT_TYPES],
    }));

    freshDraft.rotating = {
      ...freshDraft.rotating,
      tipos: [...BOTH_ASSIGNMENT_TYPES],
    };

    setDraftTemplate(freshDraft);
    setInitialRulesSnapshot(normalizeRulesSnapshot(freshDraft));

    setFixedWorker("");
    setFixedRouteId("");
    setFixedSector("");
    setBonusRouteId("");
  }, [isOpen, template]);

  const addFixedSectorRule = () => {
    if (!fixedWorker || !fixedSector) return;

    setDraftTemplate((current) => ({
      ...current,
      fixedAssignments: [
        ...current.fixedAssignments.filter(
          (rule) => rule.sectorId !== fixedSector
        ),
        {
          trabajadorId: fixedWorker,
          sectorId: fixedSector,
          tipos: [...BOTH_ASSIGNMENT_TYPES],
        },
      ],
    }));

    setFixedSector("");
  };

  const removeFixedAssignment = (index: number) => {
    setDraftTemplate((current) => ({
      ...current,
      fixedAssignments: current.fixedAssignments.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const updateBonusWorkers = (keys: unknown) => {
    setDraftTemplate((current) => ({
      ...current,
      rotating: {
        ...current.rotating,
        trabajadorIds: selectionToArray(
          keys,
          catalogWorkers.map((worker) => worker.id)
        ),
        tipos: [...BOTH_ASSIGNMENT_TYPES],
      },
    }));
  };

  const updateBonusSectorsForCurrentRoute = (keys: unknown) => {
    if (!bonusRouteId) return;

    const sectorIdsFromCurrentRoute = bonusRouteSectors.map(
      (sector) => sector.id
    );

    const selectedFromCurrentRoute = selectionToArray(
      keys,
      sectorIdsFromCurrentRoute
    );

    setDraftTemplate((current) => {
      const sectorIdsFromCurrentRouteSet = new Set(sectorIdsFromCurrentRoute);

      const sectorIdsFromOtherRoutes = current.rotating.sectorIds.filter(
        (sectorId) => !sectorIdsFromCurrentRouteSet.has(sectorId)
      );

      return {
        ...current,
        rotating: {
          ...current.rotating,
          sectorIds: [...sectorIdsFromOtherRoutes, ...selectedFromCurrentRoute],
          tipos: [...BOTH_ASSIGNMENT_TYPES],
        },
      };
    });
  };

  const saveRules = async (onClose: () => void) => {
    if (!canSaveRules) return;

    await saveTemplate(draftTemplate);
    setInitialRulesSnapshot(normalizeRulesSnapshot(draftTemplate));
    onClose();
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
                <Settings2 size={22} className="text-primary" />
                <span>Reglas permanentes de asignación</span>
              </div>

              <p className="text-sm font-normal text-slate-500">
                Estas reglas se mantienen para los próximos meses de{" "}
                <strong>{empresa || "la empresa seleccionada"}</strong>. Solo
                debes modificarlas cuando cambien los lectores, sectores fijos o
                sectores con bono.
              </p>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="mt-0.5 shrink-0" />

                    <div>
                      <p className="font-semibold">
                        Los sectores normales no se configuran aquí.
                      </p>

                      <p className="mt-1">
                        Todo sector que no esté marcado como fijo ni como sector
                        con bono será considerado libre y rotará automáticamente
                        entre los lectores disponibles.
                      </p>
                    </div>
                  </div>
                </div>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <LockKeyhole size={21} />
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Sectores fijos
                        </h2>

                        <p className="text-sm text-slate-500">
                          Sectores que siempre deben quedar asignados al mismo
                          lector. La regla aplica para lectura y reparto del
                          mismo sector.
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
                      <Select
                        label="Lector fijo"
                        placeholder="Selecciona un lector"
                        selectedKeys={
                          fixedWorker ? new Set([fixedWorker]) : new Set([])
                        }
                        onSelectionChange={(keys) =>
                          setFixedWorker(selectionToArray(keys)[0] || "")
                        }
                        variant="bordered"
                      >
                        {catalogWorkers.map((worker) => (
                          <SelectItem
                            key={worker.id}
                            classNames={selectedItemClassNames}
                          >
                            {worker.nombre}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Ruta"
                        placeholder="Selecciona una ruta"
                        selectedKeys={
                          fixedRouteId ? new Set([fixedRouteId]) : new Set([])
                        }
                        renderValue={() =>
                          selectedFixedRoute
                            ? `Ruta ${selectedFixedRoute.numero ?? "N/A"}`
                            : "Selecciona una ruta"
                        }
                        onSelectionChange={(keys) => {
                          const nextRoute = selectionToArray(keys)[0] || "";
                          setFixedRouteId(nextRoute);
                          setFixedSector("");
                        }}
                        variant="bordered"
                      >
                        {catalogRoutes.map((route) => (
                          <SelectItem
                            key={route.id}
                            classNames={selectedItemClassNames}
                          >
                            Ruta {route.numero ?? "N/A"}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Sector fijo"
                        placeholder={
                          fixedRouteId
                            ? "Selecciona un sector"
                            : "Primero selecciona una ruta"
                        }
                        selectedKeys={
                          fixedSector ? new Set([fixedSector]) : new Set([])
                        }
                        onSelectionChange={(keys) =>
                          setFixedSector(selectionToArray(keys)[0] || "")
                        }
                        isDisabled={!fixedRouteId}
                        variant="bordered"
                      >
                        {fixedRouteSectors.map((sector) => (
                          <SelectItem
                            key={sector.id}
                            classNames={selectedItemClassNames}
                          >
                            {sector.nombre}
                          </SelectItem>
                        ))}
                      </Select>

                      <Button
                        className="h-14 self-end"
                        color="primary"
                        variant="flat"
                        isDisabled={!fixedWorker || !fixedSector}
                        onPress={addFixedSectorRule}
                      >
                        Agregar fijo
                      </Button>
                    </div>

                    <div className="flex max-h-64 flex-col gap-3 overflow-auto">
                      {draftTemplate.fixedAssignments.length > 0 ? (
                        draftTemplate.fixedAssignments.map((rule, index) => {
                          const worker = workerById.get(rule.trabajadorId);
                          const sector = sectorById.get(rule.sectorId);

                          return (
                            <div
                              key={`${rule.trabajadorId}-${rule.sectorId}-${index}`}
                              className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {worker?.nombre || "Lector"}
                                  </p>

                                  <p className="mt-1 text-slate-500">
                                    {sector
                                      ? `Ruta ${
                                          sector.rutaNumero ?? "N/A"
                                        } · ${sector.nombre}`
                                      : "Sector"}
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Chip
                                      size="sm"
                                      color="primary"
                                      variant="flat"
                                    >
                                      lectura y reparto
                                    </Chip>
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  startContent={<Trash2 size={16} />}
                                  onPress={() => removeFixedAssignment(index)}
                                >
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          No hay sectores fijos registrados.
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card shadow="none" className="border border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                        <Medal size={21} />
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Sectores con bono
                        </h2>

                        <p className="text-sm text-slate-500">
                          Sectores más complejos que deben rotarse solo entre un
                          grupo específico de lectores. La regla aplica para
                          lectura y reparto del mismo sector.
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr]">
                      <Select
                        label="Lectores habilitados"
                        placeholder="Selecciona lectores"
                        selectionMode="multiple"
                        selectedKeys={new Set(
                          draftTemplate.rotating.trabajadorIds
                        )}
                        renderValue={() =>
                          bonusWorkersCount > 0
                            ? `${bonusWorkersCount} lector${
                                bonusWorkersCount !== 1 ? "es" : ""
                              } seleccionado${
                                bonusWorkersCount !== 1 ? "s" : ""
                              }`
                            : "Selecciona lectores"
                        }
                        classNames={{
                          trigger: "min-h-14 h-auto py-2",
                          value: "whitespace-normal break-words",
                        }}
                        onSelectionChange={updateBonusWorkers}
                        variant="bordered"
                      >
                        {catalogWorkers.map((worker) => (
                          <SelectItem
                            key={worker.id}
                            classNames={selectedItemClassNames}
                          >
                            {worker.nombre}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Ruta"
                        placeholder="Selecciona una ruta"
                        selectedKeys={
                          bonusRouteId ? new Set([bonusRouteId]) : new Set([])
                        }
                        renderValue={() =>
                          selectedBonusRoute
                            ? `Ruta ${selectedBonusRoute.numero ?? "N/A"}`
                            : "Selecciona una ruta"
                        }
                        onSelectionChange={(keys) => {
                          const nextRoute = selectionToArray(keys)[0] || "";
                          setBonusRouteId(nextRoute);
                        }}
                        variant="bordered"
                      >
                        {catalogRoutes.map((route) => (
                          <SelectItem
                            key={route.id}
                            classNames={selectedItemClassNames}
                          >
                            Ruta {route.numero ?? "N/A"}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Sectores con bono"
                        placeholder={
                          bonusRouteId
                            ? "Selecciona sectores"
                            : "Primero selecciona una ruta"
                        }
                        selectionMode="multiple"
                        selectedKeys={selectedBonusSectorsFromRoute}
                        renderValue={() =>
                          selectedBonusSectorsFromRoute.size > 0
                            ? `${selectedBonusSectorsFromRoute.size} sector${
                                selectedBonusSectorsFromRoute.size !== 1
                                  ? "es"
                                  : ""
                              } seleccionado${
                                selectedBonusSectorsFromRoute.size !== 1
                                  ? "s"
                                  : ""
                              } en esta ruta`
                            : "Selecciona sectores"
                        }
                        classNames={{
                          trigger: "min-h-14 h-auto py-2",
                          value: "whitespace-normal break-words",
                        }}
                        onSelectionChange={updateBonusSectorsForCurrentRoute}
                        isDisabled={!bonusRouteId}
                        variant="bordered"
                      >
                        {bonusRouteSectors.map((sector) => (
                          <SelectItem
                            key={sector.id}
                            classNames={selectedItemClassNames}
                          >
                            {sector.nombre}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>

                    {hasBonusCountMismatch ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={20}
                            className="mt-0.5 shrink-0"
                          />

                          <div>
                            <p className="font-semibold">
                              La cantidad de lectores con bono debe coincidir
                              con la cantidad de sectores con bono.
                            </p>

                            <p className="mt-1">
                              Actualmente tienes {bonusSectorsCount} sector
                              {bonusSectorsCount !== 1 ? "es" : ""} con bono y{" "}
                              {bonusWorkersCount} lector
                              {bonusWorkersCount !== 1 ? "es" : ""} habilitado
                              {bonusWorkersCount !== 1 ? "s" : ""}. Ajusta la
                              selección antes de guardar.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                          Lectores del grupo con bono
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {draftTemplate.rotating.trabajadorIds.length > 0 ? (
                            draftTemplate.rotating.trabajadorIds.map(
                              (workerId) => {
                                const worker = workerById.get(workerId);

                                return (
                                  <Chip
                                    key={workerId}
                                    size="sm"
                                    color="warning"
                                    variant="flat"
                                  >
                                    {worker?.nombre || "Lector"}
                                  </Chip>
                                );
                              }
                            )
                          ) : (
                            <p className="text-sm text-slate-500">
                              No hay lectores seleccionados.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                          Sectores con bono
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {draftTemplate.rotating.sectorIds.length > 0 ? (
                            draftTemplate.rotating.sectorIds.map((sectorId) => {
                              const sector = sectorById.get(sectorId);

                              return (
                                <Chip
                                  key={sectorId}
                                  size="sm"
                                  color="warning"
                                  variant="flat"
                                >
                                  {sector
                                    ? `R${sector.rutaNumero ?? "N/A"} - ${
                                        sector.nombre
                                      }`
                                    : "Sector"}
                                </Chip>
                              );
                            })
                          ) : (
                            <p className="text-sm text-slate-500">
                              No hay sectores con bono seleccionados.
                            </p>
                          )}
                        </div>
                      </div>
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
                isLoading={isSavingTemplate}
                isDisabled={!canSaveRules}
                onPress={() => saveRules(onClose)}
              >
                Guardar reglas
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}