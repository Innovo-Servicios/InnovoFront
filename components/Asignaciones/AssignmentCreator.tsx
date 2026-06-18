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
  Dice5,
  Eraser,
  Info,
  Save,
  Settings2,
  Wand2,
} from "lucide-react";

import {
  getAssignmentCreatorCatalog,
  getAssignmentCreatorTemplate,
  getChileanHolidays,
  previewAssignmentCreator,
  saveAssignmentCreatorTemplate,
} from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";
import RestriccionesModal from "@/components/Asignaciones/RestriccionesModal";
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
  empresa: string[];
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

interface PreviewAssignment {
  key: string;
  fecha: string;
  tipo: AssignmentType;
  source: "fija" | "rotativa" | "restante" | "manual";
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
    manual: number;
  }>;
  asignaciones: PreviewAssignment[];
  omitidas: Array<{
    sector: CatalogSector;
    tipo: AssignmentType;
    reason: string;
  }>;
}

interface ChileanHoliday {
  date: string;
  title?: string;
  type?: string;
  inalienable?: boolean;
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

interface AssignmentCreatorProps {
  onSaved?: () => void;
}

export default function AssignmentCreator({ onSaved }: AssignmentCreatorProps) {
  const { token, authenticatedFetch } = useAuth();

  const {
    isOpen: isRestrictionsOpen,
    onOpen: onRestrictionsOpen,
    onOpenChange: onRestrictionsOpenChange,
  } = useDisclosure();

  const [catalog, setCatalog] = useState<CreatorCatalog>({
    empresas: [],
    rutas: [],
    sectores: [],
    trabajadores: [],
  });

  const [empresa, setEmpresa] = useState("");
  const [monthValue, setMonthValue] = useState(nextMonthValue);
  const minMonthValue = useMemo(() => nextMonthValue(), []);

  const [template, setTemplate] = useState<CreatorTemplate>(emptyTemplate);
  const [routeSchedules, setRouteSchedules] = useState<
    Record<string, RouteSchedule>
  >({});
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [, setConflictChoices] = useState<Record<string, ConflictChoice>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [holidayErrorMessage, setHolidayErrorMessage] = useState<string | null>(
    null
  );
  const [holidaysByYear, setHolidaysByYear] = useState<Record<string, string[]>>(
    {}
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const monthTotalDays = useMemo(
    () => getMonthTotalDays(monthValue),
    [monthValue]
  );

  const selectedYear = useMemo(() => {
    return Number(monthValue.split("-")[0]);
  }, [monthValue]);

  const selectedYearKey = String(selectedYear);

  const hasHolidayData = useMemo(
    () => Object.prototype.hasOwnProperty.call(holidaysByYear, selectedYearKey),
    [holidaysByYear, selectedYearKey]
  );

  const holidayDates = useMemo(() => {
    return holidaysByYear[selectedYearKey] || [];
  }, [holidaysByYear, selectedYearKey]);

  const hasHolidayLoadBlocker =
    isLoadingHolidays || Boolean(holidayErrorMessage) || !hasHolidayData;

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

  const scheduleErrors = useMemo(() => {
    return Object.values(routeSchedules).flatMap((schedule) => schedule.errors);
  }, [routeSchedules]);

  const hasScheduleErrors = scheduleErrors.length > 0;

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

        const data = await parseJsonResponse(
          response,
          "No se pudo cargar el catálogo."
        );

        setCatalog(data);

        setRouteSchedules((current) => {
          const next: Record<string, RouteSchedule> = {};

          for (const route of data.rutas as CatalogRoute[]) {
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
    if (!token || !Number.isInteger(selectedYear)) return;

    if (hasHolidayData) {
      setHolidayErrorMessage(null);
      return;
    }

    let isActive = true;

    const loadHolidays = async () => {
      setIsLoadingHolidays(true);
      setHolidayErrorMessage(null);

      try {
        const response = await getChileanHolidays(
          token,
          selectedYear,
          authenticatedFetch
        );
        const data = await parseJsonResponse(
          response,
          "No se pudieron cargar los feriados chilenos."
        );
        const holidays = Array.isArray(data?.holidays)
          ? (data.holidays as ChileanHoliday[])
          : [];
        const holidayDatesForYear = holidays
          .map((holiday) => holiday.date)
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
          .sort();

        if (!holidayDatesForYear.length) {
          throw new Error(
            `No se encontraron feriados chilenos para ${selectedYear}.`
          );
        }

        if (!isActive) return;

        setHolidaysByYear((current) => ({
          ...current,
          [String(selectedYear)]: holidayDatesForYear,
        }));
      } catch (error) {
        if (!isActive) return;

        setHolidayErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los feriados chilenos."
        );
      } finally {
        if (isActive) {
          setIsLoadingHolidays(false);
        }
      }
    };

    loadHolidays();

    return () => {
      isActive = false;
    };
  }, [authenticatedFetch, hasHolidayData, selectedYear, token]);

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
    // La verificación completa no se edita manualmente.
    // Se calcula automáticamente desde el adelanto de verificación.
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

        const next = {
          ...current,
          [routeId]: nextSchedule,
        };

        return validateAllSchedules(next, calendarConfig);
      });

      setPreview(null);
      setConflictChoices({});
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

      const next = {
        ...current,
        [routeId]: nextSchedule,
      };

      return validateAllSchedules(next, calendarConfig);
    });

    setPreview(null);
    setConflictChoices({});
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleScheduleBlur = (
    routeId: string,
    field: AssignmentStep,
    value: string
  ) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 2);

    if (!cleanValue) {
      updateScheduleField(routeId, field, "");
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

    updateScheduleField(routeId, field, normalizedDay);
  };

  const generateProposal = () => {
    if (hasHolidayLoadBlocker) {
      setErrorMessage(
        holidayErrorMessage ||
          "Espera a que se carguen los feriados chilenos antes de generar propuesta."
      );
      return;
    }

    if (catalog.rutas.length === 0) {
      setErrorMessage("No hay rutas disponibles para generar propuesta.");
      return;
    }

    const proposal = generateCalendarProposal(catalog.rutas, calendarConfig);

    const next: Record<string, RouteSchedule> = {};

    for (const schedule of proposal) {
      next[schedule.rutaId] = schedule;
    }

    setRouteSchedules(next);
    setPreview(null);
    setConflictChoices({});
    setStatusMessage("Propuesta de calendario generada correctamente.");
    setErrorMessage(null);
  };

  const clearSchedule = () => {
    const next: Record<string, RouteSchedule> = {};

    for (const route of catalog.rutas) {
      next[route.id] = emptyRouteSchedule(route);
    }

    setRouteSchedules(next);
    setPreview(null);
    setConflictChoices({});
    setStatusMessage("Calendario limpiado. Puedes ingresar fechas desde cero.");
    setErrorMessage(null);
  };

  const buildPreviewPayload = () => {
    const [yearText, monthText] = monthValue.split("-");

    return {
      empresa,
      year: Number(yearText),
      month: Number(monthText),
      routeDays: Object.values(routeSchedules).map((schedule) => ({
        rutaId: schedule.rutaId,
        rutaNumero: schedule.rutaNumero,
        lectura: schedule.lectura,
        adelantoVerificacion: schedule.adelantoVerificacion,
        verificacion: schedule.verificacion,
        reparto: schedule.reparto,
      })),
      template,
      calendarRules: {
        holidays: holidayDates,
      },
    };
  };

  const generatePreview = async () => {
    if (!token || !empresa) return;

    if (hasHolidayLoadBlocker) {
      setErrorMessage(
        holidayErrorMessage ||
          "Espera a que se carguen los feriados chilenos antes de previsualizar."
      );
      return;
    }

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
        "Hay incongruencias en el calendario. Corrige las filas marcadas antes de previsualizar."
      );
      return;
    }

    setIsPreviewing(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await previewAssignmentCreator(
        token,
        buildPreviewPayload(),
        authenticatedFetch
      );

      const data = await parseJsonResponse(
        response,
        "No se pudo generar la previsualización."
      );

      setPreview(data);
      setConflictChoices({});
      setStatusMessage(
        "Previsualización generada correctamente. Revisa el resultado antes de guardar."
      );

      onSaved?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo generar la previsualización."
      );
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

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
            <CardBody className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
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
                    setPreview(null);
                    setConflictChoices({});
                    return;
                  }

                  setMonthValue(value);
                  setPreview(null);
                  setConflictChoices({});
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

          {isLoadingHolidays ? (
            <Card className="shrink-0 border border-blue-100 bg-blue-50">
              <CardBody className="flex items-center gap-3 text-sm text-blue-700">
                <Spinner size="sm" />
                Cargando feriados chilenos para {selectedYear}.
              </CardBody>
            </Card>
          ) : null}

          {holidayErrorMessage ? (
            <Card className="shrink-0 border border-danger-200 bg-danger-50">
              <CardBody className="text-sm text-danger-700">
                {holidayErrorMessage}
              </CardBody>
            </Card>
          ) : null}

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
                    Escribe solo el día. Arriba de cada fecha se muestra el día
                    de la semana.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Wand2 size={16} />}
                    isDisabled={hasHolidayLoadBlocker}
                    onPress={generateProposal}
                  >
                    Generar propuesta
                  </Button>

                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    startContent={<Eraser size={16} />}
                    onPress={clearSchedule}
                  >
                    Limpiar calendario
                  </Button>

                  {isLoadingCatalog || isLoadingHolidays ? (
                    <Spinner size="sm" />
                  ) : (
                    <CalendarDays size={18} />
                  )}
                </div>
              </div>
            </CardHeader>

            <CardBody className="min-h-0 flex-1 p-4">
              <div className="h-full overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[1180px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 text-xs uppercase text-slate-700">
                    <tr className="bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100">
                      <th className="px-4 py-3 text-left font-bold">Ruta</th>
                      <th className="px-4 py-3 text-center font-bold">
                        Sectores
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
                    {catalog.rutas.map((route, index) => {
                      const schedule =
                        routeSchedules[route.id] || emptyRouteSchedule(route);

                      const hasDates =
                        schedule.lectura ||
                        schedule.adelantoVerificacion ||
                        schedule.verificacion ||
                        schedule.reparto;

                      const hasErrors = schedule.errors.length > 0;

                      return (
                        <tr
                          key={route.id}
                          className={
                            index % 2 === 0
                              ? "border-t border-slate-100 bg-white"
                              : "border-t border-slate-100 bg-slate-50"
                          }
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            Ruta {route.numero ?? "N/A"}
                          </td>

                          <td className="px-4 py-3 text-center text-slate-700">
                            {route.sectores}
                          </td>

                          <ScheduleInput
                            routeNumero={route.numero}
                            label="lectura"
                            dateValue={schedule.lectura}
                            colorClass="border-purple-200 bg-purple-50/40 data-[hover=true]:border-purple-300"
                            onBlur={(value) =>
                              handleScheduleBlur(route.id, "lectura", value)
                            }
                          />

                          <ScheduleInput
                            routeNumero={route.numero}
                            label="adelanto verificación"
                            dateValue={schedule.adelantoVerificacion}
                            colorClass="border-amber-200 bg-amber-50/40 data-[hover=true]:border-amber-300"
                            onBlur={(value) =>
                              handleScheduleBlur(
                                route.id,
                                "adelantoVerificacion",
                                value
                              )
                            }
                          />

                          <ScheduleInput
                            routeNumero={route.numero}
                            label="verificación completa"
                            dateValue={schedule.verificacion}
                            colorClass="border-orange-200 bg-orange-50/40 opacity-90"
                            isReadOnly
                            onBlur={() => {}}
                          />

                          <ScheduleInput
                            routeNumero={route.numero}
                            label="reparto"
                            dateValue={schedule.reparto}
                            colorClass="border-emerald-200 bg-emerald-50/40 data-[hover=true]:border-emerald-300"
                            onBlur={(value) =>
                              handleScheduleBlur(route.id, "reparto", value)
                            }
                          />

                          <td className="px-4 py-3 text-center">
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
                                  startContent={<AlertTriangle size={14} />}
                                >
                                  Error
                                </Chip>
                                <p className="max-w-52 text-xs text-danger-600">
                                  {schedule.errors[0]}
                                </p>
                              </div>
                            ) : (
                              <Chip size="sm" color="success" variant="flat">
                                OK
                              </Chip>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {!isLoadingCatalog && catalog.rutas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
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

          {preview ? (
            <Card className="shrink-0 border border-blue-100 bg-blue-50">
              <CardHeader className="border-b border-blue-100">
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">
                    Previsualización generada
                  </h2>
                  <p className="text-sm text-blue-700">
                    Revisa el resumen antes de guardar la asignación definitiva.
                  </p>
                </div>
              </CardHeader>

              <CardBody>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 lg:grid-cols-6">
                  <PreviewStat label="Total" value={preview.resumen.total} />
                  <PreviewStat label="Nuevas" value={preview.resumen.nuevas} />
                  <PreviewStat
                    label="Conflictos"
                    value={preview.resumen.conflictos}
                  />
                  <PreviewStat
                    label="Omitidas"
                    value={preview.resumen.omitidas}
                  />
                  <PreviewStat
                    label="Lecturas"
                    value={preview.resumen.lectura}
                  />
                  <PreviewStat
                    label="Repartos"
                    value={preview.resumen.reparto}
                  />
                </div>

                {preview.resumen.conflictos > 0 ? (
                  <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
                    Hay conflictos en la propuesta. Deben resolverse antes de
                    guardar.
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <div className="grid shrink-0 grid-cols-1 gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
            <Button
              className="h-14 font-semibold"
              variant="flat"
              startContent={<Save size={18} />}
              isLoading={isSavingTemplate}
              isDisabled={!empresa || isSavingTemplate}
              onPress={() => saveTemplate()}
            >
              Guardar plantilla
            </Button>

            <Button
              className="h-14 font-semibold"
              color="primary"
              startContent={!isPreviewing ? <Dice5 size={18} /> : null}
              isLoading={isPreviewing}
              isDisabled={
                !empresa ||
                isPreviewing ||
                isPastMonth ||
                hasHolidayLoadBlocker ||
                !hasEveryRouteDates ||
                hasScheduleErrors
              }
              onPress={generatePreview}
            >
              {preview
                ? "Regenerar previsualización"
                : "Previsualizar asignación"}
            </Button>
          </div>
        </div>
      </div>

      <RestriccionesModal
        isOpen={isRestrictionsOpen}
        onOpenChange={onRestrictionsOpenChange}
        catalogRoutes={catalog.rutas}
        catalogWorkers={catalog.trabajadores}
        catalogSectors={catalog.sectores}
        template={template}
        isSavingTemplate={isSavingTemplate}
        empresa={empresa}
        saveTemplate={saveTemplate}
      />
    </div>
  );
}

function ScheduleInput({
  routeNumero,
  label,
  dateValue,
  colorClass,
  isReadOnly = false,
  onBlur,
}: {
  routeNumero: number | null;
  label: string;
  dateValue: string;
  colorClass: string;
  isReadOnly?: boolean;
  onBlur: (value: string) => void;
}) {
  const dayValue = getDayFromDate(dateValue);
  const weekday = getWeekdayLabel(dateValue);
  const [draftValue, setDraftValue] = useState(dayValue);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(dayValue);
    }
  }, [dayValue, isEditing]);

  return (
    <td className="px-4 py-3">
      <div className="mx-auto flex max-w-28 flex-col items-center gap-1">
        <span className="h-4 text-[11px] font-semibold capitalize text-slate-500">
          {weekday || "\u00A0"}
        </span>

        <Input
          aria-label={`${label} ruta ${routeNumero ?? "N/A"}`}
          placeholder=""
          size="sm"
          value={isEditing ? draftValue : dayValue}
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
          onFocus={(event) => {
            if (isReadOnly) return;

            setIsEditing(true);
            setDraftValue(dayValue);
            event.currentTarget.select();
          }}
          onValueChange={(nextValue) => {
            if (isReadOnly) return;

            setDraftValue(nextValue.replace(/\D/g, "").slice(0, 2));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          onBlur={(event) => {
            if (isReadOnly) return;

            setIsEditing(false);
            onBlur(event.target.value);
          }}
        />
      </div>
    </td>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white px-3 py-3 text-center shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
