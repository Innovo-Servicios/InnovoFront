export type AssignmentStep =
  | "lectura"
  | "adelantoVerificacion"
  | "verificacion"
  | "reparto";

export interface CalendarRuleConfig {
  monthValue: string;
  holidays?: string[];
}

export interface RouteSchedule {
  rutaId: string;
  rutaNumero: number | null;
  sectores: number;
  lectura: string;
  adelantoVerificacion: string;
  verificacion: string;
  reparto: string;
  warnings: string[];
  errors: string[];
}

interface InternalCalendarConfig extends CalendarRuleConfig {
  holidays: string[];
  recoverySaturdays: Set<string>;
}

type ReaderEventType = "lectura" | "reparto";

interface ReaderEvent {
  type: ReaderEventType;
  routeIndex: number;
}

const MIN_PROCESSING_DAYS_AFTER_VERIFICATION = 1;

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateLocal = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const parseDate = (dateString: string) => {
  return new Date(`${dateString}T00:00:00`);
};

const addDaysToDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

export const addDays = (dateString: string, days: number) => {
  return formatDateLocal(addDaysToDate(parseDate(dateString), days));
};

const isSunday = (dateString: string) => parseDate(dateString).getDay() === 0;
const isSaturday = (dateString: string) =>
  parseDate(dateString).getDay() === 6;

const isWeekday = (dateString: string) => {
  const day = parseDate(dateString).getDay();

  return day >= 1 && day <= 5;
};

const getMonthBounds = (monthValue: string) => {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  const start = `${yearText}-${monthText}-01`;
  const totalDays = new Date(year, month, 0).getDate();
  const end = `${yearText}-${monthText}-${pad(totalDays)}`;

  return {
    year,
    month,
    start,
    end,
    totalDays,
  };
};

const isInsideMonth = (dateString: string, monthValue: string) => {
  const { start, end } = getMonthBounds(monthValue);

  return dateString >= start && dateString <= end;
};

const isOutsideMonth = (dateString: string, monthValue: string) => {
  if (!dateString) return false;

  return !dateString.startsWith(`${monthValue}-`);
};

const isHoliday = (dateString: string, config: CalendarRuleConfig) => {
  return (config.holidays || []).includes(dateString);
};

export const getMonthTotalDays = (monthValue: string) => {
  return getMonthBounds(monthValue).totalDays;
};

export const normalizeDayInput = (value: string, maxDay: number) => {
  const onlyNumbers = value.replace(/\D/g, "").slice(0, 2);

  if (!onlyNumbers) return "";

  const dayNumber = Number(onlyNumbers);

  if (Number.isNaN(dayNumber) || dayNumber < 1 || dayNumber > maxDay) {
    return "";
  }

  return pad(dayNumber);
};

export const buildDateFromDay = (monthValue: string, day: string) => {
  if (!monthValue || !day) return "";

  return `${monthValue}-${pad(Number(day))}`;
};

export const getDayFromDate = (dateString: string) => {
  if (!dateString) return "";

  return dateString.split("-")[2] || "";
};

export const getWeekdayLabel = (dateString: string) => {
  if (!dateString) return "";

  return parseDate(dateString).toLocaleDateString("es-CL", {
    weekday: "long",
  });
};

const buildRecoverySaturdays = (config: CalendarRuleConfig) => {
  const holidays = config.holidays || [];

  const weekdayHolidays = holidays
    .filter((holiday) => isInsideMonth(holiday, config.monthValue))
    .filter((holiday) => isWeekday(holiday))
    .sort();

  const recoverySaturdays = new Set<string>();

  if (weekdayHolidays.length === 0) return recoverySaturdays;

  const { end } = getMonthBounds(config.monthValue);

  let recoveryDebt = weekdayHolidays.length;
  let cursor = parseDate(weekdayHolidays[0]);

  while (formatDateLocal(cursor) <= end && recoveryDebt > 0) {
    const candidate = formatDateLocal(cursor);

    if (
      isInsideMonth(candidate, config.monthValue) &&
      isSaturday(candidate) &&
      !isHoliday(candidate, config)
    ) {
      recoverySaturdays.add(candidate);
      recoveryDebt -= 1;
    }

    cursor = addDaysToDate(cursor, 1);
  }

  return recoverySaturdays;
};

const buildInternalConfig = (
  config: CalendarRuleConfig
): InternalCalendarConfig => {
  return {
    ...config,
    holidays: config.holidays || [],
    recoverySaturdays: buildRecoverySaturdays(config),
  };
};

const isReaderWorkday = (
  dateString: string,
  config: InternalCalendarConfig
) => {
  if (!dateString) return false;
  if (!isInsideMonth(dateString, config.monthValue)) return false;
  if (isHoliday(dateString, config)) return false;
  if (isSunday(dateString)) return false;

  if (isSaturday(dateString)) {
    return config.recoverySaturdays.has(dateString);
  }

  return isWeekday(dateString);
};

const isInspectorWorkday = (
  dateString: string,
  config: InternalCalendarConfig
) => {
  if (!dateString) return false;
  if (!isInsideMonth(dateString, config.monthValue)) return false;
  if (isHoliday(dateString, config)) return false;
  if (isSunday(dateString)) return false;
  if (isSaturday(dateString)) return false;

  return isWeekday(dateString);
};

export const isBlockedWorkday = (
  dateString: string,
  config: CalendarRuleConfig
) => {
  if (!dateString) return false;

  const internalConfig = buildInternalConfig(config);

  return !isReaderWorkday(dateString, internalConfig);
};

export const getBlockedReason = (
  dateString: string,
  config: CalendarRuleConfig
) => {
  const internalConfig = buildInternalConfig(config);

  if (isSunday(dateString)) return "domingo";
  if (isHoliday(dateString, config)) return "feriado";

  if (
    isSaturday(dateString) &&
    !internalConfig.recoverySaturdays.has(dateString)
  ) {
    return "sábado no habilitado";
  }

  return "";
};

const getReaderWorkdays = (config: InternalCalendarConfig) => {
  const { start, end } = getMonthBounds(config.monthValue);
  const days: string[] = [];

  let cursor = parseDate(start);

  while (formatDateLocal(cursor) <= end) {
    const candidate = formatDateLocal(cursor);

    if (isReaderWorkday(candidate, config)) {
      days.push(candidate);
    }

    cursor = addDaysToDate(cursor, 1);
  }

  return days;
};

const getInspectorWorkdays = (config: InternalCalendarConfig) => {
  const { start, end } = getMonthBounds(config.monthValue);
  const days: string[] = [];

  let cursor = parseDate(start);

  while (formatDateLocal(cursor) <= end) {
    const candidate = formatDateLocal(cursor);

    if (isInspectorWorkday(candidate, config)) {
      days.push(candidate);
    }

    cursor = addDaysToDate(cursor, 1);
  }

  return days;
};

const getNextFromList = (
  dates: string[],
  fromDate: string,
  blockedDates: Set<string> = new Set()
) => {
  return dates.find((date) => date > fromDate && !blockedDates.has(date)) || "";
};

const getOnOrAfterFromList = (
  dates: string[],
  fromDate: string,
  blockedDates: Set<string> = new Set()
) => {
  return (
    dates.find((date) => date >= fromDate && !blockedDates.has(date)) || ""
  );
};

const getByOffsetFromList = (
  dates: string[],
  fromDate: string,
  offset: number
) => {
  const availableDates = dates.filter((date) => date > fromDate);

  return availableDates[offset - 1] || "";
};

export const getNextAllowedWorkday = (
  dateString: string,
  config: CalendarRuleConfig
) => {
  const internalConfig = buildInternalConfig(config);
  const readerWorkdays = getReaderWorkdays(internalConfig);

  return getOnOrAfterFromList(readerWorkdays, dateString);
};

export const getNextStepDate = (
  previousDate: string,
  config: CalendarRuleConfig
) => {
  const internalConfig = buildInternalConfig(config);
  const readerWorkdays = getReaderWorkdays(internalConfig);

  return getNextFromList(readerWorkdays, previousDate);
};

export const getNextVerificationDate = (
  adelantoDate: string,
  config: CalendarRuleConfig
) => {
  const internalConfig = buildInternalConfig(config);
  const inspectorWorkdays = getInspectorWorkdays(internalConfig);

  return getNextFromList(inspectorWorkdays, adelantoDate);
};

export const emptyRouteSchedule = (route: {
  id: string;
  numero: number | null;
  sectores: number;
}): RouteSchedule => ({
  rutaId: route.id,
  rutaNumero: route.numero,
  sectores: route.sectores,
  lectura: "",
  adelantoVerificacion: "",
  verificacion: "",
  reparto: "",
  warnings: [],
  errors: [],
});

/**
 * Secuencia operacional por bloques.
 *
 * Para 11 rutas queda parecido al ejemplo real:
 *
 * L1, L2, L3, L4,
 * R1, R2,
 * L5,
 * R3, R4,
 * L6, L7,
 * R5,
 * L8, L9,
 * R6, R7,
 * L10, L11,
 * R8, R9, R10, R11
 *
 * Esto evita la estupidez de mandar una ruta 6 al 21 y ruta 7 al 31 sin lógica.
 */
const buildReaderEventSequence = (totalRoutes: number): ReaderEvent[] => {
  const events: ReaderEvent[] = [];

  const pushLecturas = (from: number, to: number) => {
    for (let routeIndex = from; routeIndex <= to; routeIndex++) {
      if (routeIndex >= 0 && routeIndex < totalRoutes) {
        events.push({
          type: "lectura",
          routeIndex,
        });
      }
    }
  };

  const pushRepartos = (from: number, to: number) => {
    for (let routeIndex = from; routeIndex <= to; routeIndex++) {
      if (routeIndex >= 0 && routeIndex < totalRoutes) {
        events.push({
          type: "reparto",
          routeIndex,
        });
      }
    }
  };

  if (totalRoutes <= 0) return events;

  if (totalRoutes <= 4) {
    pushLecturas(0, totalRoutes - 1);
    pushRepartos(0, totalRoutes - 1);
    return events;
  }

  pushLecturas(0, Math.min(3, totalRoutes - 1));
  pushRepartos(0, Math.min(1, totalRoutes - 1));

  if (totalRoutes > 4) pushLecturas(4, 4);
  pushRepartos(2, Math.min(3, totalRoutes - 1));

  if (totalRoutes > 5) pushLecturas(5, Math.min(6, totalRoutes - 1));
  if (totalRoutes > 4) pushRepartos(4, 4);

  if (totalRoutes > 7) pushLecturas(7, Math.min(8, totalRoutes - 1));
  if (totalRoutes > 5) pushRepartos(5, Math.min(6, totalRoutes - 1));

  if (totalRoutes > 9) pushLecturas(9, totalRoutes - 1);
  if (totalRoutes > 7) pushRepartos(7, totalRoutes - 1);

  return events;
};

const buildInitialSchedules = (
  routes: Array<{ id: string; numero: number | null; sectores: number }>
) => {
  const schedules: RouteSchedule[] = routes.map((route) => ({
    rutaId: route.id,
    rutaNumero: route.numero,
    sectores: route.sectores,
    lectura: "",
    adelantoVerificacion: "",
    verificacion: "",
    reparto: "",
    warnings: [],
    errors: [],
  }));

  return schedules;
};

const applyReaderSequence = (
  schedules: RouteSchedule[],
  readerWorkdays: string[]
) => {
  const events = buildReaderEventSequence(schedules.length);

  events.forEach((event, index) => {
    const date = readerWorkdays[index] || "";

    if (!date) return;

    if (event.type === "lectura") {
      schedules[event.routeIndex].lectura = date;
    }

    if (event.type === "reparto") {
      schedules[event.routeIndex].reparto = date;
    }
  });

  return schedules;
};

const applyInspectorDates = (
  schedules: RouteSchedule[],
  inspectorWorkdays: string[],
  readerWorkdays: string[]
) => {
  const usedAdelantoDates = new Set<string>();
  const usedVerificationDates = new Set<string>();

  schedules.forEach((schedule, index) => {
    if (!schedule.lectura) return;

    /**
     * Patrón suave:
     * - No se adelanta todos los días.
     * - Hay aire para inspectores.
     * - La verificación completa siempre es el día hábil siguiente al adelanto.
     */
    const offsetPattern = [1, 2, 3, 2, 3, 1, 2, 3, 2, 1, 3];
    const offset = offsetPattern[index % offsetPattern.length];

    const inspectorCandidates = inspectorWorkdays.filter(
      (date) => date > schedule.lectura
    );

    let adelanto =
      inspectorCandidates[offset - 1] ||
      inspectorCandidates[0] ||
      "";

    while (adelanto && usedAdelantoDates.has(adelanto)) {
      adelanto =
        inspectorCandidates.find((date) => date > adelanto) || "";
    }

    schedule.adelantoVerificacion = adelanto;

    if (adelanto) {
      usedAdelantoDates.add(adelanto);
    }

    const verificacion = adelanto
      ? getNextFromList(inspectorWorkdays, adelanto, usedVerificationDates)
      : "";

    schedule.verificacion = verificacion;

    if (verificacion) {
      usedVerificationDates.add(verificacion);
    }

    /**
     * Si el reparto del bloque quedó antes de que se pudiera verificar/procesar,
     * se empuja hacia adelante, pero respetando que no caiga en día de lectura
     * ni en otro reparto.
     */
    const lecturaDates = new Set(
      schedules.map((item) => item.lectura).filter(Boolean)
    );

    const repartoDates = new Set(
      schedules
        .filter((item) => item.rutaId !== schedule.rutaId)
        .map((item) => item.reparto)
        .filter(Boolean)
    );

    const blockedRepartoDates = new Set<string>([
      ...Array.from(lecturaDates),
      ...Array.from(repartoDates),
    ]);

    const minimumRepartoDate = schedule.verificacion
      ? getByOffsetFromList(
          readerWorkdays,
          schedule.verificacion,
          MIN_PROCESSING_DAYS_AFTER_VERIFICATION
        )
      : "";

    if (
      schedule.reparto &&
      minimumRepartoDate &&
      schedule.reparto <= minimumRepartoDate
    ) {
      schedule.reparto = getOnOrAfterFromList(
        readerWorkdays,
        minimumRepartoDate,
        blockedRepartoDates
      );
    }

    if (
      schedule.reparto &&
      schedule.lectura &&
      schedule.reparto === schedule.lectura
    ) {
      schedule.reparto = getNextFromList(
        readerWorkdays,
        schedule.reparto,
        blockedRepartoDates
      );
    }
  });

  return schedules;
};

export const generateCalendarProposal = (
  routes: Array<{ id: string; numero: number | null; sectores: number }>,
  config: CalendarRuleConfig
): RouteSchedule[] => {
  const internalConfig = buildInternalConfig(config);

  const sortedRoutes = [...routes].sort((a, b) => {
    return (a.numero ?? 0) - (b.numero ?? 0);
  });

  const readerWorkdays = getReaderWorkdays(internalConfig);
  const inspectorWorkdays = getInspectorWorkdays(internalConfig);

  if (readerWorkdays.length === 0) {
    return sortedRoutes.map((route) => ({
      ...emptyRouteSchedule(route),
      errors: ["No hay días laborales disponibles para lectura/reparto."],
      warnings: [],
    }));
  }

  let schedules = buildInitialSchedules(sortedRoutes);

  schedules = applyReaderSequence(schedules, readerWorkdays);
  schedules = applyInspectorDates(schedules, inspectorWorkdays, readerWorkdays);

  return Object.values(
    validateAllSchedules(
      Object.fromEntries(
        schedules.map((schedule) => [schedule.rutaId, schedule])
      ),
      internalConfig
    )
  );
};

const validateRouteSchedule = (
  schedule: RouteSchedule,
  config: InternalCalendarConfig
): RouteSchedule => {
  const errors: string[] = [];
  const warnings = [...schedule.warnings];

  const fields: Array<{
    key: AssignmentStep;
    label: string;
  }> = [
    { key: "lectura", label: "lectura" },
    { key: "adelantoVerificacion", label: "adelanto de verificación" },
    { key: "verificacion", label: "verificación completa" },
    { key: "reparto", label: "reparto" },
  ];

  fields.forEach((field) => {
    const value = schedule[field.key];

    if (!value) {
      errors.push(`Falta ${field.label}.`);
      return;
    }

    if (isOutsideMonth(value, config.monthValue)) {
      errors.push(`${field.label} debe estar dentro del mes seleccionado.`);
      return;
    }

    if (field.key === "lectura" || field.key === "reparto") {
      if (!isReaderWorkday(value, config)) {
        const reason = getBlockedReason(value, config);
        errors.push(`${field.label} cae en ${reason || "día no laboral"}.`);
      }
    }

    if (field.key === "adelantoVerificacion" || field.key === "verificacion") {
      if (!isInspectorWorkday(value, config)) {
        const reason = getBlockedReason(value, config);
        errors.push(`${field.label} cae en ${reason || "día no laboral"}.`);
      }
    }
  });

  if (
    schedule.lectura &&
    schedule.adelantoVerificacion &&
    schedule.adelantoVerificacion <= schedule.lectura
  ) {
    errors.push(
      "El adelanto de verificación debe ser posterior a la lectura de la misma ruta."
    );
  }

  if (
    schedule.adelantoVerificacion &&
    schedule.verificacion &&
    schedule.verificacion <= schedule.adelantoVerificacion
  ) {
    errors.push(
      "La verificación completa debe ser posterior al adelanto de verificación."
    );
  }

  if (
    schedule.verificacion &&
    schedule.reparto &&
    schedule.reparto <= schedule.verificacion
  ) {
    errors.push("El reparto debe ser posterior a la verificación completa.");
  }

  if (
    schedule.lectura &&
    schedule.reparto &&
    schedule.lectura === schedule.reparto
  ) {
    errors.push(
      "La lectura y el reparto de una ruta no pueden realizarse el mismo día."
    );
  }

  const expectedVerification =
    schedule.adelantoVerificacion &&
    getNextFromList(getInspectorWorkdays(config), schedule.adelantoVerificacion);

  if (
    schedule.verificacion &&
    expectedVerification &&
    schedule.verificacion !== expectedVerification
  ) {
    errors.push(
      `La verificación completa debe ser el día hábil siguiente al adelanto: ${getDayFromDate(
        expectedVerification
      )}.`
    );
  }

  if (config.recoverySaturdays.size > 0) {
    warnings.push(
      "Se habilitó sábado solo como recuperación automática por feriados."
    );
  }

  return {
    ...schedule,
    warnings: Array.from(new Set(warnings)),
    errors,
  };
};

export const validateAllSchedules = (
  schedules: Record<string, RouteSchedule>,
  config: CalendarRuleConfig
) => {
  const internalConfig =
    "recoverySaturdays" in config
      ? (config as InternalCalendarConfig)
      : buildInternalConfig(config);

  const lecturaDates = new Map<string, RouteSchedule[]>();
  const repartoDates = new Map<string, RouteSchedule[]>();

  Object.values(schedules).forEach((schedule) => {
    if (schedule.lectura) {
      lecturaDates.set(schedule.lectura, [
        ...(lecturaDates.get(schedule.lectura) || []),
        schedule,
      ]);
    }

    if (schedule.reparto) {
      repartoDates.set(schedule.reparto, [
        ...(repartoDates.get(schedule.reparto) || []),
        schedule,
      ]);
    }
  });

  const duplicatedLecturaDates = new Set<string>();
  const duplicatedRepartoDates = new Set<string>();
  const lecturaRepartoConflictDates = new Set<string>();

  Array.from(lecturaDates.entries()).forEach(([date, items]) => {
    if (items.length > 1) duplicatedLecturaDates.add(date);
    if (repartoDates.has(date)) lecturaRepartoConflictDates.add(date);
  });

  Array.from(repartoDates.entries()).forEach(([date, items]) => {
    if (items.length > 1) duplicatedRepartoDates.add(date);
    if (lecturaDates.has(date)) lecturaRepartoConflictDates.add(date);
  });

  const next: Record<string, RouteSchedule> = {};

  Object.entries(schedules).forEach(([routeId, schedule]) => {
    const validated = validateRouteSchedule(schedule, internalConfig);
    const errors = [...validated.errors];

    if (schedule.lectura && duplicatedLecturaDates.has(schedule.lectura)) {
      errors.push("Dos rutas no pueden tener lectura programada el mismo día.");
    }

    if (schedule.reparto && duplicatedRepartoDates.has(schedule.reparto)) {
      errors.push("Dos rutas no pueden tener reparto programado el mismo día.");
    }

    if (
      schedule.lectura &&
      lecturaRepartoConflictDates.has(schedule.lectura)
    ) {
      errors.push(
        "Este día ya tiene reparto programado. Lectura y reparto no pueden coincidir."
      );
    }

    if (
      schedule.reparto &&
      lecturaRepartoConflictDates.has(schedule.reparto)
    ) {
      errors.push(
        "Este día ya tiene lectura programada. Lectura y reparto no pueden coincidir."
      );
    }

    next[routeId] = {
      ...validated,
      errors: Array.from(new Set(errors)),
    };
  });

  return next;
};