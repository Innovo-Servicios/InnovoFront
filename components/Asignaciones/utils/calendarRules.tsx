export type AssignmentStep =
  | "lectura"
  | "adelantoVerificacion"
  | "verificacion"
  | "reparto";

export interface CalendarRuleConfig {
  monthValue: string;
  holidays: string[];
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
  allowSaturdayRecovery: boolean;
}

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateLocal = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const parseDate = (date: string) => {
  return new Date(`${date}T00:00:00`);
};

const isSunday = (date: Date) => date.getDay() === 0;

const isSaturday = (date: Date) => date.getDay() === 6;

const isOutsideMonth = (dateString: string, monthValue: string) => {
  if (!dateString) return false;

  return !dateString.startsWith(`${monthValue}-`);
};

export const getMonthTotalDays = (monthValue: string) => {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return new Date(year, month, 0).getDate();
};

export const normalizeDayInput = (value: string, maxDay: number) => {
  const onlyNumbers = value.replace(/\D/g, "").slice(0, 2);

  if (!onlyNumbers) return "";

  const dayNumber = Number(onlyNumbers);

  if (Number.isNaN(dayNumber) || dayNumber < 1 || dayNumber > maxDay) {
    return "";
  }

  return String(dayNumber).padStart(2, "0");
};

export const buildDateFromDay = (monthValue: string, day: string) => {
  if (!monthValue || !day) return "";

  return `${monthValue}-${String(day).padStart(2, "0")}`;
};

export const getDayFromDate = (date: string) => {
  if (!date) return "";

  return date.split("-")[2] || "";
};

export const addDays = (dateString: string, days: number) => {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);

  return formatDateLocal(date);
};

const isHoliday = (dateString: string, config: CalendarRuleConfig) => {
  return config.holidays.includes(dateString);
};

export const getWeekdayLabel = (dateString: string) => {
  if (!dateString) return "";

  return parseDate(dateString).toLocaleDateString("es-CL", {
    weekday: "long",
  });
};

export const isBlockedWorkday = (
  dateString: string,
  config: CalendarRuleConfig
) => {
  if (!dateString) return false;

  const date = parseDate(dateString);

  if (isSunday(date)) return true;

  if (isHoliday(dateString, config)) return true;

  return false;
};

const isBlockedWorkdayInternal = (
  dateString: string,
  config: InternalCalendarConfig
) => {
  if (!dateString) return false;

  const date = parseDate(dateString);

  if (isSunday(date)) return true;

  if (isHoliday(dateString, config)) return true;

  if (isSaturday(date) && !config.allowSaturdayRecovery) return true;

  return false;
};

export const getBlockedReason = (
  dateString: string,
  config: CalendarRuleConfig
) => {
  if (!dateString) return "";

  const date = parseDate(dateString);

  if (isSunday(date)) return "domingo";

  if (isHoliday(dateString, config)) return "feriado";

  return "";
};

const getNextAllowedWorkdayInternal = (
  dateString: string,
  config: InternalCalendarConfig
) => {
  let date = parseDate(dateString);

  while (true) {
    const candidate = formatDateLocal(date);

    if (!isBlockedWorkdayInternal(candidate, config)) {
      return candidate;
    }

    date.setDate(date.getDate() + 1);
  }
};

export const getNextAllowedWorkday = (
  dateString: string,
  config: CalendarRuleConfig
) => {
  return getNextAllowedWorkdayInternal(dateString, {
    ...config,
    allowSaturdayRecovery: true,
  });
};

const getNextStepDateInternal = (
  previousDate: string,
  config: InternalCalendarConfig
) => {
  const nextDay = addDays(previousDate, 1);

  return getNextAllowedWorkdayInternal(nextDay, config);
};

export const getNextStepDate = (
  previousDate: string,
  config: CalendarRuleConfig
) => {
  const nextDay = addDays(previousDate, 1);

  return getNextAllowedWorkday(nextDay, config);
};

export const getNextVerificationDate = (
  adelantoDate: string,
  config: CalendarRuleConfig
) => {
  let date = parseDate(addDays(adelantoDate, 1));

  while (true) {
    const candidate = formatDateLocal(date);
    const candidateDate = parseDate(candidate);

    const isInvalid =
      isSunday(candidateDate) ||
      isSaturday(candidateDate) ||
      isHoliday(candidate, config);

    if (!isInvalid) {
      return candidate;
    }

    date.setDate(date.getDate() + 1);
  }
};

export const validateRouteSchedule = (
  schedule: RouteSchedule,
  config: CalendarRuleConfig
): RouteSchedule => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields: Array<{
    key: AssignmentStep;
    label: string;
  }> = [
    { key: "lectura", label: "lectura" },
    { key: "adelantoVerificacion", label: "adelanto de verificación" },
    { key: "verificacion", label: "verificación completa" },
    { key: "reparto", label: "reparto" },
  ];

  for (const field of requiredFields) {
    const value = schedule[field.key];

    if (!value) {
      errors.push(`Falta ${field.label}.`);
      continue;
    }

    if (isOutsideMonth(value, config.monthValue)) {
      errors.push(`${field.label} debe estar dentro del mes seleccionado.`);
    }

    if (isBlockedWorkday(value, config)) {
      const reason = getBlockedReason(value, config);
      errors.push(`${field.label} cae en ${reason}.`);
    }
  }

  if (
    schedule.lectura &&
    schedule.adelantoVerificacion &&
    schedule.adelantoVerificacion <= schedule.lectura
  ) {
    errors.push(
      "El adelanto de verificación debe ser posterior a la lectura de la misma ruta."
    );
  }

  if (schedule.adelantoVerificacion && schedule.verificacion) {
    const expectedVerificationDate = getNextVerificationDate(
      schedule.adelantoVerificacion,
      config
    );

    if (schedule.verificacion !== expectedVerificationDate) {
      errors.push(
        `La verificación completa debe ser el día hábil siguiente al adelanto: ${expectedVerificationDate.split("-")[2]}.`
      );
    }
  }

  if (
    schedule.verificacion &&
    schedule.reparto &&
    schedule.reparto <= schedule.verificacion
  ) {
    errors.push("El reparto debe ser posterior a la verificación completa.");
  }

  return {
    ...schedule,
    warnings,
    errors,
  };
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

const generateReadingDates = (
  routes: Array<{ id: string; numero: number | null; sectores: number }>,
  config: InternalCalendarConfig
) => {
  let cursor = getNextAllowedWorkdayInternal(
    `${config.monthValue}-01`,
    config
  );

  return routes.map((route) => {
    const lectura = getNextAllowedWorkdayInternal(cursor, config);
    cursor = getNextStepDateInternal(lectura, config);

    return {
      route,
      lectura,
    };
  });
};

const buildSchedulesFromReadingDates = (
  readingDates: ReturnType<typeof generateReadingDates>,
  config: InternalCalendarConfig
) => {
  return readingDates.map((item, index) => {
    const nextRouteReading = readingDates[index + 1]?.lectura;

    const adelantoVerificacion =
      nextRouteReading || getNextStepDateInternal(item.lectura, config);

    const verificacion = getNextVerificationDate(
      adelantoVerificacion,
      config
    );

    const reparto = getNextStepDateInternal(verificacion, config);

    return validateRouteSchedule(
      {
        rutaId: item.route.id,
        rutaNumero: item.route.numero,
        sectores: item.route.sectores,
        lectura: item.lectura,
        adelantoVerificacion,
        verificacion,
        reparto,
        warnings: [],
        errors: [],
      },
      config
    );
  });
};

const proposalFitsMonth = (proposal: RouteSchedule[], monthValue: string) => {
  return proposal.every(
    (schedule) =>
      schedule.lectura.startsWith(`${monthValue}-`) &&
      schedule.adelantoVerificacion.startsWith(`${monthValue}-`) &&
      schedule.verificacion.startsWith(`${monthValue}-`) &&
      schedule.reparto.startsWith(`${monthValue}-`) &&
      schedule.errors.length === 0
  );
};

export const generateCalendarProposal = (
  routes: Array<{ id: string; numero: number | null; sectores: number }>,
  config: CalendarRuleConfig
): RouteSchedule[] => {
  const normalConfig: InternalCalendarConfig = {
    ...config,
    allowSaturdayRecovery: false,
  };

  const normalReadings = generateReadingDates(routes, normalConfig);
  const normalProposal = buildSchedulesFromReadingDates(
    normalReadings,
    normalConfig
  );

  if (proposalFitsMonth(normalProposal, config.monthValue)) {
    return normalProposal;
  }

  const recoveryConfig: InternalCalendarConfig = {
    ...config,
    allowSaturdayRecovery: true,
  };

  const recoveryReadings = generateReadingDates(routes, recoveryConfig);
  const recoveryProposal = buildSchedulesFromReadingDates(
    recoveryReadings,
    recoveryConfig
  );

  return recoveryProposal.map((schedule) => ({
    ...schedule,
    warnings: [
      ...schedule.warnings,
      "Se usó sábado como recuperación automática para mantener la planificación dentro del mes.",
    ],
  }));
};

export const validateAllSchedules = (
  schedules: Record<string, RouteSchedule>,
  config: CalendarRuleConfig
) => {
  const next: Record<string, RouteSchedule> = {};

  for (const [routeId, schedule] of Object.entries(schedules)) {
    next[routeId] = validateRouteSchedule(schedule, config);
  }

  return next;
};