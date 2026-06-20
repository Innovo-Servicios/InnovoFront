"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DatePicker,
  Input,
  Select,
  SelectItem,
  Textarea,
  Checkbox,
  Button,
  Spinner,
  Chip,
} from "@heroui/react";
import {
  Bell,
  FileText,
  Users,
  Briefcase,
  FileUp,
  X,
  Send,
  Info,
  Search,
  ChevronDown,
  Check,
  Download,
  ShieldCheck,
} from "lucide-react";
import {
  now,
  getLocalTimeZone,
  parseAbsoluteToLocal,
} from "@internationalized/date";
import { I18nProvider } from "@react-aria/i18n";
import { sileo } from "sileo";
import { useAuth } from "../../app/AuthContext";
import { URL } from "../../config/config";

interface Worker {
  Rut: string;
  Nombre: string;
  cargo?: string;
}

type RecipientMode = "all" | "role" | "people";

interface SignatureCodeRow {
  trabajadorId: string;
  rut: string;
  nombre: string;
  code: string;
}

interface NotificationCreateResponse {
  message?: string;
  notificationId?: string;
  requiereFirma?: boolean;
  expiresAt?: string;
  codigos?: SignatureCodeRow[];
}

const TITLE_MAX_LENGTH = 70;
const DESCRIPTION_MAX_LENGTH = 120;
const CONTENT_MAX_LENGTH = 500;

const MIN_SCHEDULE_OFFSET_MINUTES = 10;
const MAX_SCHEDULE_DAYS = 90;

export default function NotificationADD() {
  const [notificationType, setNotificationType] = useState("msg");
  const { token, authenticatedFetch } = useAuth();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(now(getLocalTimeZone()));
  const [selectedQuickSchedule, setSelectedQuickSchedule] = useState<string | null>(null);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [signatureCodes, setSignatureCodes] = useState<SignatureCodeRow[]>([]);
  const [signatureExpiresAt, setSignatureExpiresAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [selectRoles, setSelectRoles] = useState<string[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [isPeopleDropdownOpen, setIsPeopleDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const scheduleSectionRef = useRef<HTMLDivElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const roleOptions = [
    { value: "administracion", label: "Administración" },
    { value: "lector", label: "Lector" },
    { value: "supervisor", label: "Supervisor" },
    { value: "inspector", label: "Inspector" },
  ];

  const dateToPickerValue = (date: Date) => {
    return parseAbsoluteToLocal(date.toISOString());
  };

  const getMinScheduleDate = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + MIN_SCHEDULE_OFFSET_MINUTES);
    return dateToPickerValue(date);
  };

  const getMaxScheduleDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + MAX_SCHEDULE_DAYS);
    date.setHours(23, 59, 0, 0);
    return dateToPickerValue(date);
  };

  const getTodayAt = (hour: number, minute = 0) => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return dateToPickerValue(date);
  };

  const getTomorrowAt = (hour: number, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(hour, minute, 0, 0);
    return dateToPickerValue(date);
  };

  const getNextWeekdayAt = (targetDay: number, hour: number, minute = 0) => {
    const date = new Date();
    const currentDay = date.getDay();

    let daysUntilTarget = (targetDay + 7 - currentDay) % 7;

    if (daysUntilTarget === 0) {
      daysUntilTarget = 7;
    }

    date.setDate(date.getDate() + daysUntilTarget);
    date.setHours(hour, minute, 0, 0);

    return dateToPickerValue(date);
  };

  const isFutureEnough = (date: Date) => {
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + MIN_SCHEDULE_OFFSET_MINUTES);

    return date.getTime() >= minDate.getTime();
  };

  const quickScheduleOptions = useMemo(() => {
    const todayAfternoon = new Date();
    todayAfternoon.setHours(17, 0, 0, 0);

    const options = [];

    if (isFutureEnough(todayAfternoon)) {
      options.push({
        key: "today-afternoon",
        label: "Hoy por la tarde",
        helper: "17:00",
        value: () => getTodayAt(17),
      });
    }

    options.push(
      {
        key: "tomorrow-morning",
        label: "Mañana por la mañana",
        helper: "08:00",
        value: () => getTomorrowAt(8),
      },
      {
        key: "tomorrow-afternoon",
        label: "Mañana por la tarde",
        helper: "17:00",
        value: () => getTomorrowAt(17),
      },
      {
        key: "monday-morning",
        label: "Lunes por la mañana",
        helper: "08:00",
        value: () => getNextWeekdayAt(1, 8),
      }
    );

    return options;
  }, []);

  const handleScheduleToggle = (checked: boolean) => {
    setIsScheduled(checked);

    if (checked) {
      const todayAfternoon = new Date();
      todayAfternoon.setHours(17, 0, 0, 0);

      if (isFutureEnough(todayAfternoon)) {
        setScheduledDate(getTodayAt(17));
        setSelectedQuickSchedule("today-afternoon");
      } else {
        setScheduledDate(getTomorrowAt(8));
        setSelectedQuickSchedule("tomorrow-morning");
      }
    } else {
      setSelectedQuickSchedule(null);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContent("");
    setFile(null);
    setRecipientMode("all");
    setDestinatarios([]);
    setSelectRoles([]);
    setWorkerSearch("");
    setIsScheduled(false);
    setScheduledDate(now(getLocalTimeZone()));
    setSelectedQuickSchedule(null);
    setNotificationType("msg");
    setIsPeopleDropdownOpen(false);
    setRequiresSignature(false);
  };

  const getRequestError = async (response: Response) => {
    const errorText = await response.text();
    const message =
      errorText || `Error al enviar la notificación (${response.status})`;

    console.error("Error al enviar la notificación", {
      status: response.status,
      body: errorText,
    });
    return new Error(message);
  };

  const readCreateResponse = async (
    response: Response
  ): Promise<NotificationCreateResponse> => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const message = await response.text();
    return { message };
  };

  const handleCreateSuccess = async (response: Response) => {
    const payload = await readCreateResponse(response);
    const codigos = Array.isArray(payload.codigos) ? payload.codigos : [];

    setSignatureCodes(codigos);
    setSignatureExpiresAt(payload.expiresAt || null);
    resetForm();
    return payload;
  };

  const csvValue = (value: string | null | undefined) =>
    `"${String(value || "").replace(/"/g, '""')}"`;

  const exportSignatureCodes = () => {
    if (signatureCodes.length === 0) return;

    const expiresAt = signatureExpiresAt
      ? new Date(signatureExpiresAt).toLocaleString("es-CL")
      : "";
    const rows = [
      ["Nombre", "RUT", "Código", "Vence"].map(csvValue).join(","),
      ...signatureCodes.map((row) =>
        [row.nombre, row.rut, row.code, expiresAt].map(csvValue).join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const href = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `codigos-notificacion-${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(href);
  };

  const handleWhitoutDocument = async (data: any) => {
    const response = await authenticatedFetch(`${URL}/notificaciones/crearNotificacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw await getRequestError(response);
    return handleCreateSuccess(response);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const missingFields = [];

    if (recipientMode === "role" && selectRoles.length === 0) {
      missingFields.push("Cargo");
    }

    if (recipientMode === "people" && destinatarios.length === 0) {
      missingFields.push("Trabajadores específicos");
    }

    if (!notificationType) missingFields.push("Tipo de notificación");
    if (!title) missingFields.push("Título");
    if (!description) missingFields.push("Descripción");
    if (!content) missingFields.push("Contenido");
    if (notificationType === "document" && !file) missingFields.push("Archivo");

    if (missingFields.length > 0) {
      sileo.warning({
        title: "Faltan campos requeridos",
        description: missingFields.join(", "),
      });
      return;
    }

    if (isScheduled) {
      const selectedDate = scheduledDate.toDate().getTime();

      const minDate = new Date();
      minDate.setMinutes(minDate.getMinutes() + MIN_SCHEDULE_OFFSET_MINUTES);

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + MAX_SCHEDULE_DAYS);
      maxDate.setHours(23, 59, 0, 0);

      if (selectedDate < minDate.getTime()) {
        sileo.warning({
          title: "Programación demasiado próxima",
          description: `Selecciona una hora con al menos ${MIN_SCHEDULE_OFFSET_MINUTES} minutos de anticipación.`,
        });
        return;
      }

      if (selectedDate > maxDate.getTime()) {
        sileo.warning({
          title: "Programación fuera de rango",
          description: `Solo puedes programar hasta ${MAX_SCHEDULE_DAYS} días hacia adelante.`,
        });
        return;
      }
    }

    if (!token) {
      sileo.warning({
        title: "Sesión no disponible",
        description: "Vuelve a iniciar sesión para enviar la notificación.",
      });
      return;
    }

    const objetivo =
      recipientMode === "all"
        ? ["all"]
        : recipientMode === "people"
        ? destinatarios
        : [];

    const cargo = recipientMode === "role" ? selectRoles : [];

    const scheduledDatePayload = isScheduled
      ? scheduledDate.toDate().toISOString()
      : null;

    const data = {
      token,
      objetivo,
      tipo: notificationType,
      titulo: title,
      mensaje: description,
      contenido: content,
      fechaProgramacion: scheduledDatePayload,
      archivo: file,
      cargo,
      programada: isScheduled,
      requiereFirma: requiresSignature,
    };

    setIsSubmitting(true);

    const submitRequest = async () => {
      if (notificationType !== "document") {
        return handleWhitoutDocument(data);
      }

      const formData = new FormData();

      if (token) {
        formData.append("token", token);
      }

      formData.append("objetivo", JSON.stringify(objetivo));
      formData.append("tipo", notificationType);
      formData.append("titulo", title);
      formData.append("mensaje", description);
      formData.append("contenido", content);
      formData.append(
        "fechaProgramacion",
        scheduledDatePayload || ""
      );
      formData.append("programada", String(isScheduled));
      formData.append("requiereFirma", String(requiresSignature));
      formData.append("file", file as Blob);
      formData.append("cargo", JSON.stringify(cargo));

      const response = await authenticatedFetch(
        `${URL}/notificaciones/crearNotificacionDocumento`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw await getRequestError(response);
      return handleCreateSuccess(response);
    };

    try {
      await sileo.promise(submitRequest(), {
        loading: {
          title: isScheduled ? "Programando notificación" : "Enviando notificación",
          description: "Estamos procesando los destinatarios seleccionados.",
        },
        success: (payload) => ({
          title: isScheduled ? "Notificación programada" : "Notificación enviada",
          description:
            payload.message ||
            (payload.codigos?.length
              ? `Se generaron ${payload.codigos.length} códigos de firma.`
              : "La operación terminó correctamente."),
        }),
        error: (error) => ({
          title: "No se pudo enviar la notificación",
          description:
            error instanceof Error ? error.message : "Inténtalo nuevamente.",
        }),
      });
    } catch (error) {
      console.error("Error al crear la notificación:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchWorkers = async () => {
    const res = await authenticatedFetch(`${URL}/trabajador/listarTrabajadores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const json = await res.json();

    const sortedWorkers = Array.isArray(json)
      ? json.sort((a: Worker, b: Worker) =>
          a.Nombre.localeCompare(b.Nombre, "es", { sensitivity: "base" })
        )
      : [];

    setWorkers(sortedWorkers);
  };

  useEffect(() => {
    if (token != null) {
      fetchWorkers();
    }
  }, [authenticatedFetch, token]);

  useEffect(() => {
    if (!isScheduled) return;
    const timeout = setTimeout(() => {
      scheduleSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [isScheduled]);




  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPeopleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRecipientModeChange = (mode: RecipientMode) => {
    setRecipientMode(mode);
    setWorkerSearch("");
    setIsPeopleDropdownOpen(false);

    if (mode === "all") {
      setDestinatarios([]);
      setSelectRoles([]);
    }

    if (mode === "role") {
      setDestinatarios([]);
    }

    if (mode === "people") {
      setSelectRoles([]);
    }
  };

  const selectedWorkers = useMemo(() => {
    return workers.filter((worker) => destinatarios.includes(worker.Rut));
  }, [workers, destinatarios]);

  const filteredWorkers = useMemo(() => {
    const query = workerSearch.trim().toLowerCase();

    return workers.filter((worker) => {
      const matchesSearch =
        !query ||
        worker.Nombre.toLowerCase().includes(query) ||
        worker.Rut.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [workers, workerSearch]);

  const addWorker = (rut: string) => {
    if (!destinatarios.includes(rut)) {
      setDestinatarios((prev) => [...prev, rut]);
    }
  };

  const removeWorker = (rut: string) => {
    setDestinatarios((prev) => prev.filter((item) => item !== rut));
  };

  const toggleWorkerSelection = (rut: string) => {
    if (destinatarios.includes(rut)) {
      removeWorker(rut);
    } else {
      addWorker(rut);
    }
  };

  const getSelectedRoleLabels = () => {
    if (selectRoles.length === 0) return "Seleccione uno o más cargos";

    return roleOptions
      .filter((role) => selectRoles.includes(role.value))
      .map((role) => role.label)
      .join(", ");
  };

  const getPeopleTriggerText = () => {
    if (destinatarios.length === 0) {
      return "Selecciona uno o más trabajadores";
    }

    if (destinatarios.length === 1) {
      const worker = selectedWorkers[0];
      return worker ? worker.Nombre : "1 trabajador seleccionado";
    }

    return `${destinatarios.length} trabajadores seleccionados`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      console.log("Archivo seleccionado:", selectedFile);
    }
  };

  const handleDragOver = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
      setFile(droppedFile);
      console.log("Archivo arrastrado:", droppedFile);
    }
  };

  if (workers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <Spinner size="md" />
        <span className="text-sm text-slate-500">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-5">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">
          Nueva notificación
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Completa los datos para enviar una nueva notificación.
        </p>
      </div>

      {signatureCodes.length > 0 && (
        <section className="mb-4 shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-900">
                  Códigos de firma generados
                </h2>
                <p className="text-xs text-emerald-700">
                  Vencen{" "}
                  {signatureExpiresAt
                    ? new Date(signatureExpiresAt).toLocaleString("es-CL")
                    : "en 12 horas"}
                  .
                </p>
              </div>
            </div>

            <Button
              size="sm"
              color="success"
              variant="flat"
              startContent={<Download size={16} />}
              onPress={exportSignatureCodes}
            >
              Exportar
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-xl border border-emerald-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-emerald-100 text-emerald-900">
                <tr>
                  <th className="px-3 py-2">Trabajador</th>
                  <th className="px-3 py-2">RUT</th>
                  <th className="px-3 py-2">Código</th>
                </tr>
              </thead>
              <tbody>
                {signatureCodes.map((row) => (
                  <tr key={row.trabajadorId} className="border-t border-emerald-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {row.nombre}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.rut}</td>
                    <td className="px-3 py-2 font-mono text-sm font-bold text-emerald-800">
                      {row.code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="form-scroll min-h-0 flex-1 overflow-y-auto pr-2">
        <form className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Users size={22} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Destinatarios
                </h2>
                <p className="text-xs text-slate-500">
                  Define a quién se enviará esta notificación.
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={recipientMode === "all" ? "solid" : "flat"}
                color={recipientMode === "all" ? "primary" : "default"}
                className="rounded-xl font-semibold"
                onPress={() => handleRecipientModeChange("all")}
              >
                Todos
              </Button>

              <Button
                type="button"
                variant={recipientMode === "role" ? "solid" : "flat"}
                color={recipientMode === "role" ? "primary" : "default"}
                className="rounded-xl font-semibold"
                onPress={() => handleRecipientModeChange("role")}
              >
                Por cargo
              </Button>

              <Button
                type="button"
                variant={recipientMode === "people" ? "solid" : "flat"}
                color={recipientMode === "people" ? "primary" : "default"}
                className="rounded-xl font-semibold"
                onPress={() => handleRecipientModeChange("people")}
              >
                Personas
              </Button>
            </div>

            {recipientMode === "all" && (
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                <Info size={18} className="mt-0.5 flex-shrink-0" />
                <p>
                  La notificación será enviada a todos los trabajadores
                  registrados.
                </p>
              </div>
            )}

            {recipientMode === "role" && (
              <div className="space-y-3">
                <Select
                  label="Cargos"
                  variant="bordered"
                  placeholder={getSelectedRoleLabels()}
                  selectedKeys={new Set(selectRoles)}
                  selectionMode="multiple"
                  startContent={
                    <Briefcase className="text-default-400" size={18} />
                  }
                  onSelectionChange={(keys) =>
                    setSelectRoles(Array.from(keys as Set<string>))
                  }
                >
                  {roleOptions.map((role) => {
                    const isSelected = selectRoles.includes(role.value);

                    return (
                      <SelectItem
                        key={role.value}
                        classNames={{
                          base: isSelected
                            ? "bg-blue-100 text-blue-700 data-[hover=true]:bg-blue-200 data-[selectable=true]:focus:bg-blue-200"
                            : "data-[hover=true]:bg-slate-100",
                          title: isSelected ? "font-semibold" : "",
                          selectedIcon: isSelected ? "text-blue-600" : "",
                        }}
                      >
                        {role.label}
                      </SelectItem>
                    );
                  })}
                </Select>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                  <Info size={18} className="mt-0.5 flex-shrink-0" />
                  <p>
                    Se enviará a todos los trabajadores que pertenezcan a los
                    cargos seleccionados.
                  </p>
                </div>
              </div>
            )}

            {recipientMode === "people" && (
              <div className="space-y-3">
                {selectedWorkers.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-500">
                        Personas seleccionadas
                      </p>

                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {selectedWorkers.length}
                      </span>
                    </div>

                    <div className="form-scroll max-h-32 overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkers.map((worker, index) => (
                          <Chip
                            key={worker.Rut}
                            onClose={() => removeWorker(worker.Rut)}
                            className={
                              index % 2 === 0
                                ? "bg-blue-100 text-blue-700"
                                : "bg-sky-100 text-sky-700"
                            }
                          >
                            {worker.Nombre}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsPeopleDropdownOpen(!isPeopleDropdownOpen)
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-400"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Trabajadores específicos
                      </p>
                      <p className="truncate text-sm text-slate-800">
                        {getPeopleTriggerText()}
                      </p>
                    </div>

                    <ChevronDown
                      size={18}
                      className={`text-slate-500 transition-transform ${
                        isPeopleDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isPeopleDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-3">
                        <Input
                          label="Buscar trabajador"
                          placeholder="Buscar por nombre o RUT"
                          value={workerSearch}
                          onChange={(e) => setWorkerSearch(e.target.value)}
                          variant="bordered"
                          startContent={
                            <Search className="text-default-400" size={18} />
                          }
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                        {filteredWorkers.length > 0 ? (
                          filteredWorkers.map((worker, index) => {
                            const isSelected = destinatarios.includes(
                              worker.Rut
                            );

                            return (
                              <button
                                key={worker.Rut}
                                type="button"
                                onClick={() =>
                                  toggleWorkerSelection(worker.Rut)
                                }
                                className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                                  index % 2 === 0
                                    ? "bg-white hover:bg-blue-50"
                                    : "bg-slate-50 hover:bg-sky-50"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {worker.Nombre}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    RUT: {worker.Rut}
                                  </p>
                                </div>

                                {isSelected && (
                                  <div className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                    <Check size={16} />
                                  </div>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-4 text-center text-sm text-slate-500">
                            No se encontraron trabajadores.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                  <Info size={18} className="mt-0.5 flex-shrink-0" />
                  <p>
                    La notificación se enviará solamente a las personas que
                    selecciones aquí.
                  </p>
                </div>
              </div>
            )}
          </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Bell size={22} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Información principal
                </h2>
                <p className="text-xs text-slate-500">
                  Define el tipo, título y descripción de la notificación.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={notificationType === "msg" ? "solid" : "flat"}
                  color={notificationType === "msg" ? "primary" : "default"}
                  className="rounded-xl font-semibold"
                  onPress={() => setNotificationType("msg")}
                >
                  Mensaje
                </Button>

                <Button
                  type="button"
                  variant={notificationType === "document" ? "solid" : "flat"}
                  color={
                    notificationType === "document" ? "primary" : "default"
                  }
                  className="rounded-xl font-semibold"
                  onPress={() => setNotificationType("document")}
                >
                  Documento
                </Button>

                <Button
                  type="button"
                  variant={notificationType === "alert" ? "solid" : "flat"}
                  color={notificationType === "alert" ? "primary" : "default"}
                  className="rounded-xl font-semibold"
                  onPress={() => setNotificationType("alert")}
                >
                  Alerta
                </Button>
              </div>

              <div>
                <Input
                  label="Título"
                  placeholder="Introduce el título de la notificación"
                  startContent={<Bell className="text-default-400" size={18} />}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  variant="bordered"
                  maxLength={TITLE_MAX_LENGTH}
                />

                <div className="mt-1 flex justify-end text-xs text-slate-400">
                  {title.length}/{TITLE_MAX_LENGTH}
                </div>
              </div>

              <div>
                <Textarea
                  label="Descripción"
                  placeholder="Introduce la descripción de la notificación"
                  startContent={
                    <FileText className="text-default-400" size={18} />
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  variant="bordered"
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />

                <div className="mt-1 flex justify-end text-xs text-slate-400">
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <FileText size={22} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Contenido</h2>
                <p className="text-xs text-slate-500">
                  Escribe el contenido que recibirán los destinatarios.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Textarea
                  label="Contenido"
                  placeholder="Introduce el contenido de la notificación"
                  startContent={
                    <FileText className="text-default-400" size={18} />
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  variant="bordered"
                  maxLength={CONTENT_MAX_LENGTH}
                />

                <div className="mt-1 flex justify-end text-xs text-slate-400">
                  {content.length}/{CONTENT_MAX_LENGTH}
                </div>
              </div>

              {notificationType === "document" && (
                <div
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-4 ${
                    dragging
                      ? "border-secondary bg-secondary/10"
                      : "border-primary"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".xlsx, .xls, .pdf, .doc, .docx, .jpg, .jpeg, .png"
                    className="hidden"
                    id="file-input"
                    onChange={handleFileSelect}
                  />

                  <label
                    htmlFor="file-input"
                    className="flex min-h-32 cursor-pointer flex-col items-center justify-center text-center text-sm text-slate-500"
                  >
                    {file ? (
                      <div className="flex flex-row items-center justify-center gap-4">
                        <p className="font-medium text-primary">{file.name}</p>

                        <Button
                          className="relative z-10"
                          size="sm"
                          variant="bordered"
                          color="primary"
                          onPress={() => setFile(null)}
                        >
                          <X size={16} color="red" />
                        </Button>
                      </div>
                    ) : dragging ? (
                      <>
                        <FileUp size={42} className="mb-3 text-secondary" />
                        <p>Suelta el archivo aquí</p>
                      </>
                    ) : (
                      <>
                        <FileUp size={42} className="mb-3 text-primary" />
                        <p>Arrastra y suelta un archivo aquí</p>
                        <p>o haz clic para seleccionarlo</p>
                      </>
                    )}
                  </label>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                <Info size={18} className="mt-0.5 flex-shrink-0" />
                <p>Revisa que el contenido sea claro antes de enviarlo.</p>
              </div>
            </div>
          </section>

          <section
            ref={scheduleSectionRef}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Checkbox
              isSelected={isScheduled}
              onValueChange={handleScheduleToggle} 
            >
              Programar notificación
            </Checkbox>

            {isScheduled && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Opciones rápidas
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {quickScheduleOptions.map((option) => {
                      const isSelected = selectedQuickSchedule === option.key;

                      return (
                        <Button
                          key={option.key}
                          type="button"
                          variant={isSelected ? "solid" : "flat"}
                          color={isSelected ? "primary" : "default"}
                          className="h-auto rounded-xl px-3 py-2 text-left"
                          onPress={() => {
                            setScheduledDate(option.value());
                            setSelectedQuickSchedule(option.key);
                          }}
                        >
                          <div className="flex w-full flex-col items-start">
                            <span
                              className={`text-sm font-semibold ${
                                isSelected ? "text-white" : "text-slate-800"
                              }`}
                            >
                              {option.label}
                            </span>
                            
                            <span
                              className={`text-xs ${
                                isSelected ? "text-white/80" : "text-slate-500"
                              }`}
                            >
                              {option.helper}
                            </span>
                          </div>
                        </Button>
                      );
                    })}

                  </div>
                </div>

                <I18nProvider locale="es-CL">
                  <DatePicker
                    label="Fecha de programación"
                    variant="bordered"
                    hideTimeZone
                    showMonthAndYearPickers
                    value={scheduledDate}
                    minValue={getMinScheduleDate()}
                    maxValue={getMaxScheduleDate()}
                    onChange={(date) => {
                      if (date) {
                        setScheduledDate(date);
                        setSelectedQuickSchedule(null);
                      }
                    }}
                  />
                </I18nProvider>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                  <Info size={18} className="mt-0.5 flex-shrink-0" />
                  <p>
                    Puedes programar una notificación desde{" "}
                    <strong>{MIN_SCHEDULE_OFFSET_MINUTES} minutos</strong>{" "}
                    hasta <strong>{MAX_SCHEDULE_DAYS} días</strong> hacia
                    adelante.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Checkbox
              isSelected={requiresSignature}
              onValueChange={setRequiresSignature}
            >
              Requiere firma y aceptación
            </Checkbox>

            {requiresSignature && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" />
                <p>
                  Se generará un código único de 6 dígitos para cada
                  destinatario. El usuario deberá firmar con ese código y luego
                  presionar Acepto dentro de las próximas 12 horas.
                </p>
              </div>
            )}
          </section>
        </form>
      </div>

      <div className="mt-4 shrink-0 border-t border-slate-200 bg-white pt-4">
        <Button
          color="primary"
          type="button"
          className="w-full font-semibold shadow-sm"
          onPress={handleSubmit}
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
          startContent={isSubmitting ? undefined : <Send size={18} />}
        >
          {isSubmitting
            ? isScheduled
              ? "Programando..."
              : "Enviando..."
            : "Enviar notificación"}
        </Button>
      </div>
    </div>
  );
}
