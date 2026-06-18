"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  useDisclosure,
} from "@heroui/react";

import {
  AlertTriangle,
  CalendarDays,
  Eraser,
  Info,
  Save,
  Settings2,
  UserRoundCog,
  Wand2,
} from "lucide-react";

import {
  getAssignmentCreatorCatalog,
  getAssignmentCreatorTemplate,
  saveAssignmentCreatorTemplate,
} from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";
import RestriccionesModal from "@/components/Asignaciones/RestriccionesModal";
import AusenciasPlanificadasModal, {
  PlannedAbsenceRule,
} from "@/components/Asignaciones/AusenciasPlanificadasModal";
import {
  AssignmentStep,
  buildDateFromDay,
  CalendarRuleConfig,
  emptyRouteSchedule,
  generateCalendarProposal,
  getDayFromDate,
  getMonthTotalDays,
  getNextStepDate,
  getNextVerificationDate,
  getWeekdayLabel,
  normalizeDayInput,
  RouteSchedule,
  validateAllSchedules,
} from "@/components/Asignaciones/utils/calendarRules";

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
  cargo: "administracion" | "lector" | "supervisor" | "inspector" | string;

  empresas_trabajador?: string[];
  empresasTrabajador?: string[];
  empresas?: string[];
  empresa?: string | string[];
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

interface AssignmentCreatorProps {
  onSaved?: () => void;
}

const ASSIGNMENT_TYPES: AssignmentType[] = ["lectura", "reparto"];

const DEFAULT_EMPRESAS = ["GasValpo", "Comercial"];

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

/*
  Temporal.
  Lo correcto después es traer feriados desde backend:
  GET /api/feriados?year=2026
*/
const HOLIDAYS_BY_YEAR: Record<string, string[]> = {
  "2026": [
    // "2026-01-01",
    // "2026-04-03",
    // "2026-05-01",
  ],
};

const nextMonthValue = () => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return `${nextMonth.getFullYear()}-${String(
    nextMonth.getMonth() + 1
  ).padStart(2, "0")}`;
};

const selectionToArray = (keys: unknown, allValues: string[] = []) => {
  if (keys === "all") return allValues;

  return Array.from(keys as Iterable<unknown>).map(String);
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

  /*
    Si backend todavía no manda empresas_trabajador en todos los trabajadores,
    no bloqueamos al lector para no romper la pantalla.
    Cuando venga el dato, este filtro separa GasValpo/Comercial correctamente.
  */
  if (empresas.length === 0) return true;

  return empresas.some(
    (item) => normalizeText(item) === normalizeText(empresa)
  );
};

const workerHasCargo = (worker: CatalogWorker, cargo: string) => {
  return normalizeText(worker.cargo) === normalizeText(cargo);
};

const normalizeWorker = (worker: any): CatalogWorker | null => {
  if (!worker) return null;

  const id = worker.id || worker._id;

  if (!id) return null;

  const empresaValue = Array.isArray(worker.empresa)
    ? worker.empresa
    : worker.empresa
    ? [worker.empresa]
    : [];

  const empresasValue = Array.isArray(worker.empresas)
    ? worker.empresas
    : [];

  const empresasTrabajadorValue = Array.isArray(worker.empresas_trabajador)
    ? worker.empresas_trabajador
    : Array.isArray(worker.empresasTrabajador)
    ? worker.empresasTrabajador
    : [];

  return {
    id: String(id),
    nombre: String(worker.nombre || worker.Nombre || ""),
    rut: String(worker.rut || worker.Rut || ""),
    cargo: normalizeText(worker.cargo || worker.rol || ""),

    empresas_trabajador: empresasTrabajadorValue,
    empresasTrabajador: empresasTrabajadorValue,
    empresas: empresasValue,
    empresa: empresaValue,
  };
};

const mergeWorkers = (...groups: any[][]): CatalogWorker[] => {
  const map = new Map<string, CatalogWorker>();

  for (const group of groups) {
    if (!Array.isArray(group)) continue;

    for (const rawWorker of group) {
      const worker = normalizeWorker(rawWorker);

      if (!worker) continue;

      const previous = map.get(worker.id);

      if (!previous) {
        map.set(worker.id, worker);
        continue;
      }

      const previousCompanies = getWorkerCompanies(previous);
      const currentCompanies = getWorkerCompanies(worker);

      map.set(worker.id, {
        ...previous,
        ...worker,
        empresas_trabajador: Array.from(
          new Set([
            ...(previous.empresas_trabajador || []),
            ...(worker.empresas_trabajador || []),
          ])
        ),
        empresasTrabajador: Array.from(
          new Set([
            ...(previous.empresasTrabajador || []),
            ...(worker.empresasTrabajador || []),
          ])
        ),
        empresas: Array.from(
          new Set([
            ...(previous.empresas || []),
            ...(worker.empresas || []),
            ...previousCompanies,
            ...currentCompanies,
          ])
        ),
        empresa:
          currentCompanies.length > 0
            ? currentCompanies
            : previousCompanies.length > 0
            ? previousCompanies
            : [],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const cargoOrder: Record<string, number> = {
      inspector: 1,
      supervisor: 2,
      lector: 3,
      administracion: 4,
    };

    const cargoA = cargoOrder[normalizeText(a.cargo)] ?? 99;
    const cargoB = cargoOrder[normalizeText(b.cargo)] ?? 99;

    if (cargoA !== cargoB) return cargoA - cargoB;

    return a.nombre.localeCompare(b.nombre);
  });
};

const seededRandom = (seed: number) => {
  let value = seed || 1;

  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const shuffleBySeed = <T,>(items: T[], seed: number) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(seededRandom(seed + index) * (index + 1));

    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
};

const parseJsonResponse = async (
  response: Response,
  fallbackMessage: string
) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = Array.isArray(data?.errors)
      ? ` ${data.errors.join(" ")}`
      : "";

    throw new Error(`${data?.message || fallbackMessage}${detail}`);
  }

  return data;
};

const normalizeCatalogResponse = (data: any): CreatorCatalog => {
  const trabajadores = mergeWorkers(
    data?.trabajadores,
    data?.workers,
    data?.lectores,
    data?.inspectores,
    data?.supervisores,
    data?.administradores,
    data?.administracion
  );

  return {
    empresas:
      Array.isArray(data?.empresas) && data.empresas.length > 0
        ? data.empresas
        : DEFAULT_EMPRESAS,
    rutas: Array.isArray(data?.rutas) ? data.rutas : [],
    sectores: Array.isArray(data?.sectores) ? data.sectores : [],
    trabajadores,
  };
};

export default function AssignmentCreator({ onSaved }: AssignmentCreatorProps) {
  const { token, authenticatedFetch } = useAuth();

  const {
    isOpen: isRestrictionsOpen,
    onOpen: onRestrictionsOpen,
    onOpenChange: onRestrictionsOpenChange,
  } = useDisclosure();

  const {
    isOpen: isAbsencesOpen,
    onOpen: onAbsencesOpen,
    onOpenChange: onAbsencesOpenChange,
  } = useDisclosure();

  const [catalog, setCatalog] = useState<CreatorCatalog>({
    empresas: DEFAULT_EMPRESAS,
    rutas: [],
    sectores: [],
    trabajadores: [],
  });

  const [empresa, setEmpresa] = useState(DEFAULT_EMPRESAS[0]);
  const [monthValue, setMonthValue] = useState(nextMonthValue);
  const minMonthValue = useMemo(() => nextMonthValue(), []);

  const [template, setTemplate] = useState<CreatorTemplate>(emptyTemplate);
  const [routeSchedules, setRouteSchedules] = useState<
    Record<string, RouteSchedule>
  >({});

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [rotationSeed, setRotationSeed] = useState(1);
  const [absences, setAbsences] = useState<PlannedAbsenceRule[]>([]);

  const monthTotalDays = useMemo(
    () => getMonthTotalDays(monthValue),
    [monthValue]
  );

  const holidayDates = useMemo(() => {
    const year = monthValue.split("-")[0];

    return HOLIDAYS_BY_YEAR[year] || [];
  }, [monthValue]);

  const calendarConfig = useMemo<CalendarRuleConfig>(
    () => ({
      monthValue,
      holidays: holidayDates,
    }),
    [holidayDates, monthValue]
  );

  const isPastMonth = useMemo(() => {
    return monthValue < minMonthValue;
  }, [monthValue, minMonthValue]);

  const scheduleErrors = useMemo(() => {
    return Object.values(routeSchedules).flatMap((schedule) => schedule.errors);
  }, [routeSchedules]);

  const hasScheduleErrors = scheduleErrors.length > 0;

  const hasEveryRouteDates = useMemo(() => {
    if (catalog.rutas.length === 0) return false;

    return catalog.rutas.every((route) => {
      const schedule = routeSchedules[route.id];

      return Boolean(
        schedule?.lectura &&
          schedule?.adelantoVerificacion &&
          schedule?.verificacion &&
          schedule?.reparto
      );
    });
  }, [catalog.rutas, routeSchedules]);

  const companyWorkers = useMemo(() => {
    return catalog.trabajadores.filter((worker) =>
      workerBelongsToEmpresa(worker, empresa)
    );
  }, [catalog.trabajadores, empresa]);

  const companyReaders = useMemo(() => {
    return companyWorkers.filter((worker) => workerHasCargo(worker, "lector"));
  }, [companyWorkers]);

  const companySectors = useMemo(() => {
    return catalog.sectores.filter((sector) => {
      if (!empresa) return true;

      return normalizeText(sector.empresa) === normalizeText(empresa);
    });
  }, [catalog.sectores, empresa]);

  const workerById = useMemo(() => {
    return new Map(companyWorkers.map((worker) => [worker.id, worker]));
  }, [companyWorkers]);

  const sectorsByRouteId = useMemo(() => {
    const map = new Map<string, CatalogSector[]>();

    for (const sector of companySectors) {
      if (!sector.rutaId) continue;

      const current = map.get(sector.rutaId) || [];

      map.set(sector.rutaId, [...current, sector]);
    }

    catalog.rutas.forEach((route) => {
      const sectors = map.get(route.id) || [];

      map.set(
        route.id,
        [...sectors].sort((a, b) => {
          const aNumber = a.numero ?? 0;
          const bNumber = b.numero ?? 0;

          return aNumber - bNumber;
        })
      );
    });

    return map;
  }, [catalog.rutas, companySectors]);

  const fixedRuleBySectorId = useMemo(() => {
    const map = new Map<string, FixedAssignmentRule>();

    for (const rule of template.fixedAssignments) {
      map.set(rule.sectorId, rule);
    }

    return map;
  }, [template.fixedAssignments]);

  const bonusSectorIds = useMemo(() => {
    return new Set(template.rotating.sectorIds);
  }, [template.rotating.sectorIds]);

  const bonusWorkers = useMemo(() => {
    const selectedBonusWorkers = template.rotating.trabajadorIds
      .map((workerId) => workerById.get(workerId))
      .filter(Boolean) as CatalogWorker[];

    return shuffleBySeed(selectedBonusWorkers, rotationSeed + 777);
  }, [template.rotating.trabajadorIds, workerById, rotationSeed]);

  const freeWorkers = useMemo(() => {
    return shuffleBySeed(companyReaders, rotationSeed + 333);
  }, [companyReaders, rotationSeed]);

  const freeSectorIds = useMemo(() => {
    return companySectors
      .filter((sector) => {
        const isFixed = fixedRuleBySectorId.has(sector.id);
        const isBonus = bonusSectorIds.has(sector.id);

        return !isFixed && !isBonus;
      })
      .sort((a, b) => {
        const routeDiff = (a.rutaNumero ?? 0) - (b.rutaNumero ?? 0);

        if (routeDiff !== 0) return routeDiff;

        return (a.numero ?? 0) - (b.numero ?? 0);
      })
      .map((sector) => sector.id);
  }, [companySectors, fixedRuleBySectorId, bonusSectorIds]);

  const bonusSectorIdsOrdered = useMemo(() => {
    return companySectors
      .filter((sector) => bonusSectorIds.has(sector.id))
      .sort((a, b) => {
        const routeDiff = (a.rutaNumero ?? 0) - (b.rutaNumero ?? 0);

        if (routeDiff !== 0) return routeDiff;

        return (a.numero ?? 0) - (b.numero ?? 0);
      })
      .map((sector) => sector.id);
  }, [companySectors, bonusSectorIds]);

  const getBonusWorkerForSector = (sectorId: string) => {
    if (bonusWorkers.length === 0) return null;

    const index = bonusSectorIdsOrdered.indexOf(sectorId);

    if (index < 0) return null;

    return bonusWorkers[index % bonusWorkers.length] || null;
  };

  const getFreeWorkerForSector = (sectorId: string) => {
    if (freeWorkers.length === 0) return null;

    const index = freeSectorIds.indexOf(sectorId);

    if (index < 0) return null;

    return freeWorkers[index % freeWorkers.length] || null;
  };

  const getSectorBaseWorker = (sector: CatalogSector) => {
    const fixedRule = fixedRuleBySectorId.get(sector.id);

    if (fixedRule) {
      return workerById.get(fixedRule.trabajadorId) || null;
    }

    if (bonusSectorIds.has(sector.id)) {
      return getBonusWorkerForSector(sector.id);
    }

    return getFreeWorkerForSector(sector.id);
  };

  const getSectorAssignmentLabel = (sector: CatalogSector) => {
    const baseWorker = getSectorBaseWorker(sector);

    if (!baseWorker) {
      if (fixedRuleBySectorId.has(sector.id)) {
        return "Lector fijo no disponible";
      }

      if (bonusSectorIds.has(sector.id)) {
        return "Bono sin lector asignado";
      }

      return "Rotación libre sin lector";
    }

    return baseWorker.nombre;
  };

  const getSectorAssignmentColor = (sector: CatalogSector) => {
    if (fixedRuleBySectorId.has(sector.id)) return "primary";

    if (bonusSectorIds.has(sector.id)) return "warning";

    return "default";
  };

  const loadCatalog = useCallback(
    async (selectedEmpresa?: string) => {
      if (!token) return;

      setIsLoadingCatalog(true);
      setErrorMessage(null);

      try {
        const response = await getAssignmentCreatorCatalog(
          token,
          selectedEmpresa,
          authenticatedFetch
        );

        const rawData = await parseJsonResponse(
          response,
          "No se pudo cargar el catálogo."
        );

        const data = normalizeCatalogResponse(rawData);

        setCatalog(data);

        console.log(
          "TRABAJADORES NORMALIZADOS",
          data.trabajadores.map((worker) => ({
            nombre: worker.nombre,
            cargo: worker.cargo,
            empresas: getWorkerCompanies(worker),
          }))
        );

        setEmpresa((currentEmpresa) => {
          if (currentEmpresa && data.empresas.includes(currentEmpresa)) {
            return currentEmpresa;
          }

          return data.empresas[0] || DEFAULT_EMPRESAS[0];
        });

        setRouteSchedules((current) => {
          const next: Record<string, RouteSchedule> = {};

          for (const route of data.rutas) {
            const currentSchedule = current[route.id];

            next[route.id] = currentSchedule
              ? {
                  ...currentSchedule,
                  rutaNumero: route.numero,
                  sectores: route.sectores,
                }
              : emptyRouteSchedule(route);
          }

          return validateAllSchedules(next, calendarConfig);
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catálogo."
        );
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    [authenticatedFetch, calendarConfig, token]
  );

  const loadTemplate = useCallback(
    async (selectedEmpresa: string) => {
      if (!token || !selectedEmpresa) return;

      try {
        const response = await getAssignmentCreatorTemplate(
          token,
          selectedEmpresa,
          authenticatedFetch
        );

        const data = await parseJsonResponse(
          response,
          "No se pudo cargar la plantilla."
        );

        const nextTemplate = data.plantilla || emptyTemplate();

        setTemplate({
          ...nextTemplate,
          rotating: {
            ...nextTemplate.rotating,
            tipos: [...ASSIGNMENT_TYPES],
          },
          fixedAssignments: nextTemplate.fixedAssignments.map(
            (rule: FixedAssignmentRule) => ({
              ...rule,
              tipos: [...ASSIGNMENT_TYPES],
            })
          ),
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la plantilla."
        );
        setTemplate(emptyTemplate());
      }
    },
    [authenticatedFetch, token]
  );

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!empresa) return;

    setRotationSeed(1);
    loadTemplate(empresa);
  }, [empresa, loadTemplate]);

  useEffect(() => {
    setRouteSchedules((current) =>
      validateAllSchedules(current, calendarConfig)
    );
  }, [calendarConfig]);

  const saveTemplate = async (templateOverride?: CreatorTemplate) => {
    if (!token || !empresa) return;

    const templateToSave = templateOverride ?? template;

    setIsSavingTemplate(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await saveAssignmentCreatorTemplate(
        token,
        empresa,
        templateToSave,
        authenticatedFetch
      );

      const data = await parseJsonResponse(
        response,
        "No se pudo guardar la plantilla."
      );

      setTemplate(data.plantilla || templateToSave);
      setStatusMessage(data.message || "Plantilla guardada correctamente.");
      onSaved?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la plantilla."
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const updateScheduleField = (
    routeId: string,
    field: AssignmentStep,
    rawValue: string
  ) => {
    if (field === "verificacion") return;

    const cleanValue = rawValue.replace(/\D/g, "").slice(0, 2);

    if (!cleanValue) {
      setRouteSchedules((current) => {
        const currentSchedule = current[routeId];

        if (!currentSchedule) return current;

        const nextSchedule: RouteSchedule = {
          ...currentSchedule,
          [field]: "",
        };

        if (field === "adelantoVerificacion") {
          nextSchedule.verificacion = "";
        }

        return validateAllSchedules(
          {
            ...current,
            [routeId]: nextSchedule,
          },
          calendarConfig
        );
      });

      setStatusMessage(null);
      setErrorMessage(null);
      return;
    }

    const normalizedDay = normalizeDayInput(cleanValue, monthTotalDays);

    if (!normalizedDay) {
      setErrorMessage(
        `El día debe estar entre 01 y ${String(monthTotalDays).padStart(
          2,
          "0"
        )}.`
      );
      return;
    }

    const fullDate = buildDateFromDay(monthValue, normalizedDay);

    setRouteSchedules((current) => {
      const currentSchedule = current[routeId];

      if (!currentSchedule) return current;

      const nextSchedule: RouteSchedule = {
        ...currentSchedule,
        [field]: fullDate,
      };

      if (field === "adelantoVerificacion") {
        const nextVerification = getNextVerificationDate(
          fullDate,
          calendarConfig
        );

        nextSchedule.verificacion = nextVerification;

        if (!nextSchedule.reparto || nextSchedule.reparto <= nextVerification) {
          nextSchedule.reparto = getNextStepDate(
            nextVerification,
            calendarConfig
          );
        }
      }

      return validateAllSchedules(
        {
          ...current,
          [routeId]: nextSchedule,
        },
        calendarConfig
      );
    });

    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleScheduleBlur = (
    routeId: string,
    field: AssignmentStep,
    value: string
  ) => {
    const normalizedDay = normalizeDayInput(value, monthTotalDays);

    if (!normalizedDay && value.trim() !== "") {
      setErrorMessage(
        `El día debe estar entre 01 y ${String(monthTotalDays).padStart(
          2,
          "0"
        )}.`
      );
    }

    updateScheduleField(routeId, field, normalizedDay);
  };

  const generateProposal = () => {
    if (!empresa) {
      setErrorMessage("Selecciona una empresa antes de generar propuesta.");
      return;
    }

    if (catalog.rutas.length === 0) {
      setErrorMessage("No hay rutas disponibles para generar propuesta.");
      return;
    }

    if (companyReaders.length === 0) {
      setErrorMessage(
        `No hay lectores disponibles para ${empresa}. Revisa cargo="lector" y empresas_trabajador.`
      );
      return;
    }

    setRotationSeed(Date.now());

    const proposal = generateCalendarProposal(catalog.rutas, calendarConfig);

    const next: Record<string, RouteSchedule> = {};

    for (const schedule of proposal) {
      next[schedule.rutaId] = schedule;
    }

    setRouteSchedules(next);
    setStatusMessage("Propuesta de calendario generada correctamente.");
    setErrorMessage(null);
  };

  const clearSchedule = () => {
    const next: Record<string, RouteSchedule> = {};

    for (const route of catalog.rutas) {
      next[route.id] = emptyRouteSchedule(route);
    }

    setRouteSchedules(next);
    setStatusMessage("Calendario limpiado. Puedes ingresar fechas desde cero.");
    setErrorMessage(null);
  };

  const saveAssignmentPlan = async () => {
    if (!token || !empresa) return;

    if (isPastMonth) {
      setErrorMessage(
        "Las asignaciones se generan desde el mes siguiente en adelante."
      );
      return;
    }

    if (!hasEveryRouteDates) {
      setErrorMessage(
        "Debes definir lectura, adelanto de verificación, verificación completa y reparto para todas las rutas."
      );
      return;
    }

    if (hasScheduleErrors) {
      setErrorMessage(
        "Hay incongruencias en el calendario. Corrige las filas marcadas antes de guardar."
      );
      return;
    }

    await saveTemplate(template);
  };
  
  const workersForRestrictions = catalog.trabajadores.map((worker) => ({
    ...worker,
    empresa: Array.isArray(worker.empresa) ? worker.empresa[0] : worker.empresa,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Asignaciones</h1>

        <p className="mt-1 text-sm text-slate-500">
          Configura lectura, adelanto de verificación, verificación completa y
          reparto.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex min-h-full flex-col gap-5">
          <Card className="shrink-0">
            <CardBody className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
              <Select
                label="Empresa"
                selectedKeys={empresa ? new Set([empresa]) : new Set([])}
                onSelectionChange={(keys) => {
                  const nextEmpresa = selectionToArray(keys)[0] || "";
                  setEmpresa(nextEmpresa);
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                isDisabled={isLoadingCatalog}
                variant="bordered"
              >
                {catalog.empresas.map((item) => (
                  <SelectItem key={item}>{item}</SelectItem>
                ))}
              </Select>

              <Input
                label="Mes a generar"
                type="month"
                value={monthValue}
                min={minMonthValue}
                onValueChange={(value) => {
                  if (value < minMonthValue) {
                    setMonthValue(minMonthValue);
                    setErrorMessage(
                      "Las asignaciones se generan desde el mes siguiente en adelante."
                    );
                    return;
                  }

                  setMonthValue(value);
                  setErrorMessage(null);
                }}
                isInvalid={isPastMonth}
                errorMessage={
                  isPastMonth
                    ? "No se pueden generar asignaciones para meses pasados."
                    : ""
                }
                variant="bordered"
              />

              <Button
                className="h-14 self-end"
                variant="flat"
                startContent={<Settings2 size={18} />}
                isDisabled={!empresa || isLoadingCatalog}
                onPress={onRestrictionsOpen}
              >
                Reglas permanentes
              </Button>

              <Button
                className="h-14 self-end"
                variant="flat"
                color={absences.length > 0 ? "danger" : "default"}
                startContent={<UserRoundCog size={18} />}
                isDisabled={!empresa || isLoadingCatalog}
                onPress={onAbsencesOpen}
              >
                Ausencias planificadas
                {absences.length > 0 ? ` (${absences.length})` : ""}
              </Button>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 shrink-0" />
              <p>
                El sistema propone las lecturas por ruta y calcula
                automáticamente la verificación completa al día hábil siguiente
                del adelanto. Se evitan domingos y feriados chilenos.
              </p>
            </div>
          </div>

          {statusMessage ? (
            <Card className="shrink-0 border border-success-200 bg-success-50">
              <CardBody className="text-sm text-success-700">
                {statusMessage}
              </CardBody>
            </Card>
          ) : null}

          {errorMessage ? (
            <Card className="shrink-0 border border-danger-200 bg-danger-50">
              <CardBody className="text-sm text-danger-700">
                {errorMessage}
              </CardBody>
            </Card>
          ) : null}

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="shrink-0 border-b border-slate-200">
              <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Calendario por ruta</h2>
                  <p className="text-sm text-slate-500">
                    Cada ruta muestra sus sectores y el lector/regla asignada.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Wand2 size={16} />}
                    onPress={generateProposal}
                    isDisabled={!empresa || isLoadingCatalog}
                  >
                    Generar propuesta
                  </Button>

                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    startContent={<Eraser size={16} />}
                    onPress={clearSchedule}
                    isDisabled={!empresa || isLoadingCatalog}
                  >
                    Limpiar calendario
                  </Button>

                  {isLoadingCatalog ? (
                    <Spinner size="sm" />
                  ) : (
                    <CalendarDays size={18} />
                  )}
                </div>
              </div>
            </CardHeader>

            <CardBody className="min-h-0 flex-1 p-4">
              <div className="h-full overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[1250px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 text-xs uppercase text-slate-700">
                    <tr className="bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100">
                      <th className="px-4 py-3 text-left font-bold">Ruta</th>
                      <th className="px-4 py-3 text-left font-bold">
                        Sectores
                      </th>
                      <th className="px-4 py-3 text-left font-bold">
                        Lector / regla
                      </th>
                      <th className="px-4 py-3 text-center font-bold">
                        Lectura
                      </th>
                      <th className="px-4 py-3 text-center font-bold">
                        Adelanto verif.
                      </th>
                      <th className="px-4 py-3 text-center font-bold">
                        Verificación completa
                      </th>
                      <th className="px-4 py-3 text-center font-bold">
                        Reparto
                      </th>
                      <th className="px-4 py-3 text-center font-bold">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {catalog.rutas.flatMap((route, routeIndex) => {
                      const schedule =
                        routeSchedules[route.id] || emptyRouteSchedule(route);

                      const sectors = sectorsByRouteId.get(route.id) || [];
                      const visibleSectors =
                        sectors.length > 0 ? sectors : [null];

                      const hasDates =
                        schedule.lectura ||
                        schedule.adelantoVerificacion ||
                        schedule.verificacion ||
                        schedule.reparto;

                      const hasErrors = schedule.errors.length > 0;
                      const rowSpan = visibleSectors.length;

                      return visibleSectors.map((sector, sectorIndex) => {
                        const isFirstSectorRow = sectorIndex === 0;

                        return (
                          <tr
                            key={`${route.id}-${
                              sector?.id || "empty"
                            }-${sectorIndex}`}
                            className={
                              routeIndex % 2 === 0
                                ? "border-t border-slate-100 bg-white"
                                : "border-t border-slate-100 bg-slate-50"
                            }
                          >
                            {isFirstSectorRow ? (
                              <td
                                rowSpan={rowSpan}
                                className="w-28 px-4 py-3 align-top font-semibold text-slate-800"
                              >
                                Ruta {route.numero ?? "N/A"}
                              </td>
                            ) : null}

                            <td className="min-w-[300px] px-4 py-2 align-top">
                              {sector ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <p className="font-semibold text-slate-800">
                                    {sector.nombre}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    Sector {sector.numero ?? "N/A"}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500">
                                  Sin sectores.
                                </p>
                              )}
                            </td>

                            <td className="min-w-[280px] px-4 py-2 align-top">
                              {sector ? (
                                <div className="flex flex-col gap-1">
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color={getSectorAssignmentColor(sector)}
                                    className="max-w-full justify-start"
                                  >
                                    {getSectorAssignmentLabel(sector)}
                                  </Chip>

                                  {fixedRuleBySectorId.has(sector.id) ? (
                                    <span className="text-xs font-medium text-blue-600">
                                      Sector fijo
                                    </span>
                                  ) : bonusSectorIds.has(sector.id) ? (
                                    <span className="text-xs font-medium text-amber-600">
                                      Sector con bono
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-500">
                                      Rotación libre
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Chip size="sm" variant="flat">
                                  Sin regla
                                </Chip>
                              )}
                            </td>

                            {isFirstSectorRow ? (
                              <>
                                <ScheduleInput
                                  rowSpan={rowSpan}
                                  routeNumero={route.numero}
                                  label="lectura"
                                  dateValue={schedule.lectura}
                                  colorClass="border-purple-200 bg-purple-50/40 data-[hover=true]:border-purple-300"
                                  onChange={(value) =>
                                    updateScheduleField(
                                      route.id,
                                      "lectura",
                                      value
                                    )
                                  }
                                  onBlur={(value) =>
                                    handleScheduleBlur(
                                      route.id,
                                      "lectura",
                                      value
                                    )
                                  }
                                />

                                <ScheduleInput
                                  rowSpan={rowSpan}
                                  routeNumero={route.numero}
                                  label="adelanto verificación"
                                  dateValue={schedule.adelantoVerificacion}
                                  colorClass="border-amber-200 bg-amber-50/40 data-[hover=true]:border-amber-300"
                                  onChange={(value) =>
                                    updateScheduleField(
                                      route.id,
                                      "adelantoVerificacion",
                                      value
                                    )
                                  }
                                  onBlur={(value) =>
                                    handleScheduleBlur(
                                      route.id,
                                      "adelantoVerificacion",
                                      value
                                    )
                                  }
                                />

                                <ScheduleInput
                                  rowSpan={rowSpan}
                                  routeNumero={route.numero}
                                  label="verificación completa"
                                  dateValue={schedule.verificacion}
                                  colorClass="border-orange-200 bg-orange-50/40 opacity-90"
                                  isReadOnly
                                  onChange={() => {}}
                                  onBlur={() => {}}
                                />

                                <ScheduleInput
                                  rowSpan={rowSpan}
                                  routeNumero={route.numero}
                                  label="reparto"
                                  dateValue={schedule.reparto}
                                  colorClass="border-emerald-200 bg-emerald-50/40 data-[hover=true]:border-emerald-300"
                                  onChange={(value) =>
                                    updateScheduleField(
                                      route.id,
                                      "reparto",
                                      value
                                    )
                                  }
                                  onBlur={(value) =>
                                    handleScheduleBlur(
                                      route.id,
                                      "reparto",
                                      value
                                    )
                                  }
                                />

                                <td
                                  rowSpan={rowSpan}
                                  className="px-4 py-3 text-center align-top"
                                >
                                  {!hasDates ? (
                                    <Chip size="sm" variant="flat">
                                      Pendiente
                                    </Chip>
                                  ) : hasErrors ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Chip
                                        size="sm"
                                        color="danger"
                                        variant="flat"
                                        startContent={
                                          <AlertTriangle size={14} />
                                        }
                                      >
                                        Error
                                      </Chip>

                                      <p className="max-w-52 text-xs text-danger-600">
                                        {schedule.errors[0]}
                                      </p>
                                    </div>
                                  ) : (
                                    <Chip
                                      size="sm"
                                      color="success"
                                      variant="flat"
                                    >
                                      OK
                                    </Chip>
                                  )}
                                </td>
                              </>
                            ) : null}
                          </tr>
                        );
                      });
                    })}

                    {!isLoadingCatalog && catalog.rutas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          Selecciona una empresa con rutas configuradas.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <div className="grid shrink-0 grid-cols-1 gap-4 border-t border-slate-200 pt-4">
            <Button
              className="h-14 font-semibold"
              color="primary"
              startContent={<Save size={18} />}
              isLoading={isSavingTemplate}
              isDisabled={
                !empresa ||
                isSavingTemplate ||
                isPastMonth ||
                !hasEveryRouteDates ||
                hasScheduleErrors
              }
              onPress={saveAssignmentPlan}
            >
              Guardar asignación
            </Button>
          </div>
        </div>
      </div>

      <RestriccionesModal
      isOpen={isRestrictionsOpen}
      onOpenChange={onRestrictionsOpenChange}
      catalogRoutes={catalog.rutas}
      catalogWorkers={workersForRestrictions}
      catalogSectors={catalog.sectores}
      template={template}
      isSavingTemplate={isSavingTemplate}
      empresa={empresa}
      saveTemplate={saveTemplate}
    />

      <AusenciasPlanificadasModal
        isOpen={isAbsencesOpen}
        onOpenChange={onAbsencesOpenChange}
        empresa={empresa}
        targetMonth={monthValue}
        catalogWorkers={catalog.trabajadores}
        absences={absences}
        onAbsencesChange={setAbsences}
      />
    </div>
  );
}

function ScheduleInput({
  routeNumero,
  label,
  dateValue,
  colorClass,
  rowSpan = 1,
  isReadOnly = false,
  onChange,
  onBlur,
}: {
  routeNumero: number | null;
  label: string;
  dateValue: string;
  colorClass: string;
  rowSpan?: number;
  isReadOnly?: boolean;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
}) {
  const dayValue = getDayFromDate(dateValue);
  const weekday = getWeekdayLabel(dateValue);

  const [draftValue, setDraftValue] = useState(dayValue);

  useEffect(() => {
    setDraftValue(dayValue);
  }, [dayValue]);

  const commitValue = () => {
    if (isReadOnly) return;

    const cleanValue = draftValue.replace(/\D/g, "").slice(0, 2);

    onBlur(cleanValue);
  };

  return (
    <td rowSpan={rowSpan} className="px-4 py-3 align-top">
      <div className="mx-auto flex max-w-28 flex-col items-center gap-1">
        <span className="h-4 text-[11px] font-semibold capitalize text-slate-500">
          {weekday || "\u00A0"}
        </span>

        <Input
          aria-label={`${label} ruta ${routeNumero ?? "N/A"}`}
          placeholder=""
          size="sm"
          value={draftValue}
          maxLength={2}
          inputMode="numeric"
          pattern="[0-9]*"
          variant="bordered"
          isReadOnly={isReadOnly}
          classNames={{
            inputWrapper: `${colorClass} ${
              isReadOnly ? "cursor-not-allowed bg-slate-100" : ""
            }`,
            input: "text-center font-semibold text-slate-800",
          }}
          onValueChange={(nextValue) => {
            if (isReadOnly) return;

            const cleanValue = nextValue.replace(/\D/g, "").slice(0, 2);

            setDraftValue(cleanValue);
          }}
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitValue();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </td>
  );
}