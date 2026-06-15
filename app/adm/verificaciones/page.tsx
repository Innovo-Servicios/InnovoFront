"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Switch,
} from "@heroui/react";
import {
  Camera,
  CheckCircle2,
  Clock,
  MapPinned,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
import AuthenticatedImage from "@/components/common/AuthenticatedImage";

type VerificationStatus = "pendiente" | "validada" | "validada_por_captura_inicial";

type VerificationItem = {
  id: string;
  id_verificacion: string;
  estado: VerificationStatus;
  fecha: string;
  radioMetros: number | null;
  respuestaAt?: string | null;
  latRespuesta?: number | null;
  lngRespuesta?: number | null;
  distanciaMetros?: number | null;
  coordenadasActualizadas?: boolean;
  fotografia?: string | null;
  intentos: Array<{ estado: string }>;
  trabajador: {
    id: string | null;
    nombre: string | null;
    rut: string | null;
    cargo: string | null;
  } | null;
  direccion: {
    calle: string | null;
    numero: number | null;
    numeroMedidor: number | null;
    lat: number | null;
    lng: number | null;
  } | null;
  sector: {
    nombre: string | null;
    numero: number | null;
    ruta: number | null;
    empresa: string | null;
  } | null;
};

type VerificationResponse = {
  resumen: {
    total: number;
    pendiente: number;
    validada: number;
    validada_por_captura_inicial: number;
    trabajadoresPendientes: number;
    fueraDeRango: number;
  };
  verificaciones: VerificationItem[];
};

type Config = {
  enabled: boolean;
  cantidadDiaria: number;
  radioMetros: number | null;
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

const toInputDate = (date: Date) =>
  [date.getFullYear(), padDatePart(date.getMonth() + 1), padDatePart(date.getDate())].join("-");

const defaultToday = toInputDate(new Date());

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatDistance = (value?: number | null) =>
  value === null || value === undefined ? "-" : `${Math.round(value)} m`;

const formatCoordinates = (lat?: number | null, lng?: number | null) =>
  lat === null || lat === undefined || lng === null || lng === undefined
    ? "-"
    : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

const getStatusLabel = (status: VerificationStatus) => {
  if (status === "validada") return "Validada";
  if (status === "validada_por_captura_inicial") return "Coordenada inicial";
  return "Pendiente";
};

const getStatusColor = (status: VerificationStatus) => {
  if (status === "pendiente") return "warning";
  if (status === "validada_por_captura_inicial") return "secondary";
  return "success";
};

export default function AdminVerificaciones() {
  const { token, socket, authenticatedFetch } = useAuth();
  const [fechaInicio, setFechaInicio] = useState(defaultToday);
  const [fechaFin, setFechaFin] = useState(defaultToday);
  const [estado, setEstado] = useState("todos");
  const [trabajadorFilter, setTrabajadorFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [config, setConfig] = useState<Config>({ enabled: true, cantidadDiaria: 1, radioMetros: null });
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    const response = await authenticatedFetch(`${URL}/verificacionTerreno/admin/config`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return;
    const nextConfig = await response.json();
    setConfig({
      enabled: Boolean(nextConfig.enabled),
      cantidadDiaria: Number(nextConfig.cantidadDiaria) || 1,
      radioMetros: null,
    });
  }, [authenticatedFetch, token]);

  const fetchVerificaciones = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(`${URL}/verificacionTerreno/admin/listar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaInicio, fechaFin, estado }),
        cache: "no-store",
      });
      const parsed = await response.json();
      if (!response.ok) {
        throw new Error(parsed?.message || "No se pudieron cargar las validaciones de terreno.");
      }
      setData(parsed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las validaciones de terreno.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, estado, fechaFin, fechaInicio, token]);

  useEffect(() => {
    fetchConfig().catch(() => {});
  }, [fetchConfig]);

  useEffect(() => {
    fetchVerificaciones();
  }, [fetchVerificaciones]);

  useEffect(() => {
    if (!socket || !token) return;
    socket.on("actualizarVerificacionTerreno", fetchVerificaciones);
    return () => {
      socket.off("actualizarVerificacionTerreno", fetchVerificaciones);
    };
  }, [fetchVerificaciones, socket, token]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = data?.verificaciones ?? [];
    return items.filter((item) => {
      if (trabajadorFilter !== "todos" && item.trabajador?.id !== trabajadorFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.trabajador?.nombre,
        item.trabajador?.rut,
        item.direccion?.calle,
        item.direccion?.numeroMedidor?.toString(),
        item.sector?.nombre,
        item.sector?.empresa,
        item.sector?.ruta?.toString(),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data?.verificaciones, search, trabajadorFilter]);

  const workerOptions = useMemo(() => {
    const workers = new Map<string, { id: string; label: string }>();
    for (const item of data?.verificaciones ?? []) {
      if (!item.trabajador?.id) {
        continue;
      }
      workers.set(item.trabajador.id, {
        id: item.trabajador.id,
        label: `${item.trabajador.nombre || "Sin nombre"} (${item.trabajador.rut || "Sin RUT"})`,
      });
    }
    return Array.from(workers.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data?.verificaciones]);

  const saveConfig = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await authenticatedFetch(`${URL}/verificacionTerreno/admin/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          cantidadDiaria: config.cantidadDiaria,
        }),
      });
      const parsed = await response.json();
      if (!response.ok) {
        throw new Error(parsed?.message || "No se pudo guardar la configuración.");
      }
      setConfig(parsed);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const resumen = data?.resumen ?? {
    total: 0,
    pendiente: 0,
    validada: 0,
    validada_por_captura_inicial: 0,
    trabajadoresPendientes: 0,
    fueraDeRango: 0,
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Validaciones de terreno</h1>
          <p className="mt-1 text-sm text-slate-500">
            Control aleatorio de presencia basado en asignaciones diarias.
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          startContent={<RefreshCw size={16} />}
          isLoading={isLoading}
          onPress={fetchVerificaciones}
        >
          Actualizar
        </Button>
      </div>

      <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<ShieldCheck size={20} />} label="Total" value={resumen.total} />
        <SummaryCard icon={<Clock size={20} />} label="Pendientes" value={resumen.pendiente} tone="warning" />
        <SummaryCard icon={<CheckCircle2 size={20} />} label="Validadas" value={resumen.validada} tone="success" />
        <SummaryCard icon={<MapPinned size={20} />} label="Coords iniciales" value={resumen.validada_por_captura_inicial} tone="secondary" />
      </section>

      <section className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input label="Desde" type="date" value={fechaInicio} onValueChange={setFechaInicio} variant="bordered" />
          <Input label="Hasta" type="date" value={fechaFin} onValueChange={setFechaFin} variant="bordered" />
          <Select
            label="Estado"
            selectedKeys={new Set([estado])}
            onSelectionChange={(keys) => setEstado(String(Array.from(keys)[0] || "todos"))}
            variant="bordered"
          >
            <SelectItem key="todos">Todos</SelectItem>
            <SelectItem key="pendiente">Pendientes</SelectItem>
            <SelectItem key="validada">Validadas</SelectItem>
            <SelectItem key="validada_por_captura_inicial">Coordenada inicial</SelectItem>
          </Select>
          <Select
            label="Trabajador"
            selectedKeys={new Set([trabajadorFilter])}
            onSelectionChange={(keys) => {
              const value = keys === "all" ? "todos" : String(Array.from(keys)[0] || "todos");
              setTrabajadorFilter(value);
            }}
            variant="bordered"
          >
            <>
              <SelectItem key="todos">Todos</SelectItem>
              {workerOptions.map((worker) => (
                <SelectItem key={worker.id}>{worker.label}</SelectItem>
              ))}
            </>
          </Select>
          <Input
            label="Buscar"
            value={search}
            onValueChange={setSearch}
            variant="bordered"
            startContent={<Search size={16} className="text-slate-400" />}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configuración</h2>
              <p className="text-xs text-slate-500">Valores diarios para trabajadores con asignación vigente.</p>
            </div>
            <Switch
              isSelected={config.enabled}
              onValueChange={(enabled) => setConfig((current) => ({ ...current, enabled }))}
              size="sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              label="Cantidad"
              type="number"
              min={1}
              max={10}
              value={String(config.cantidadDiaria)}
              onValueChange={(value) =>
                setConfig((current) => ({ ...current, cantidadDiaria: Number(value) || 1 }))
              }
              variant="bordered"
            />
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Radio</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Sin límite de metros</p>
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            color="primary"
            startContent={<Save size={16} />}
            isLoading={isSaving}
            onPress={saveConfig}
          >
            Guardar configuración
          </Button>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Registros</h2>
            <p className="text-sm text-slate-500">{filtered.length} resultados visibles</p>
          </div>
          <Chip variant="flat" color="primary" startContent={<Users size={14} />}>
            {resumen.trabajadoresPendientes} trabajadores pendientes
          </Chip>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Trabajador</th>
                <th className="px-4 py-3 text-left">Dirección</th>
                <th className="px-4 py-3 text-left">Sector</th>
                <th className="px-4 py-3 text-left">Respuesta</th>
                <th className="px-4 py-3 text-left">Distancia</th>
                <th className="px-4 py-3 text-left">Coords capturadas</th>
                <th className="px-4 py-3 text-left">Foto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Chip size="sm" color={getStatusColor(item.estado) as any} variant="flat">
                      {getStatusLabel(item.estado)}
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.trabajador?.nombre || "Sin trabajador"}</div>
                    <div className="text-xs text-slate-500">{item.trabajador?.rut || "Sin RUT"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.direccion?.calle || "Sin dirección"}</div>
                    <div className="text-xs text-slate-500">Medidor {item.direccion?.numeroMedidor ?? "N/A"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{item.sector?.nombre || "Sin sector"}</div>
                    <div className="text-xs text-slate-500">Ruta {item.sector?.ruta ?? "N/A"}</div>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(item.respuestaAt)}</td>
                  <td className="px-4 py-3">{formatDistance(item.distanciaMetros)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatCoordinates(item.latRespuesta, item.lngRespuesta)}
                  </td>
                  <td className="px-4 py-3">
                    {item.fotografia ? (
                      <AuthenticatedImage
                        filePath={item.fotografia}
                        alt="Foto validación"
                        className="h-14 w-14 cursor-pointer rounded-md object-cover"
                        downloadName={`validacion-${item.id}.jpg`}
                      />
                    ) : (
                      <Camera size={18} className="text-slate-300" />
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No hay validaciones para los filtros seleccionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Chip size="sm" color={getStatusColor(item.estado) as any} variant="flat">
                  {getStatusLabel(item.estado)}
                </Chip>
                <span className="text-xs text-slate-500">{formatDistance(item.distanciaMetros)}</span>
              </div>
              <h3 className="font-semibold text-slate-900">{item.trabajador?.nombre || "Sin trabajador"}</h3>
              <p className="text-xs text-slate-500">{item.trabajador?.rut || "Sin RUT"}</p>
              <div className="mt-3 text-sm text-slate-700">
                <p>{item.direccion?.calle || "Sin dirección"}</p>
                <p className="text-xs text-slate-500">Medidor {item.direccion?.numeroMedidor ?? "N/A"}</p>
                <p className="text-xs text-slate-500">Ruta {item.sector?.ruta ?? "N/A"} · {item.sector?.nombre || "Sin sector"}</p>
                <p className="text-xs text-slate-500">Respuesta: {formatDateTime(item.respuestaAt)}</p>
                <p className="text-xs text-slate-500">
                  Coords: {formatCoordinates(item.latRespuesta, item.lngRespuesta)}
                </p>
              </div>
              {item.fotografia ? (
                <AuthenticatedImage
                  filePath={item.fotografia}
                  alt="Foto validación"
                  className="mt-3 h-28 w-full cursor-pointer rounded-md object-cover"
                  downloadName={`validacion-${item.id}.jpg`}
                />
              ) : null}
            </article>
          ))}
          {!filtered.length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No hay validaciones para los filtros seleccionados.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "primary" | "success" | "warning" | "danger" | "secondary";
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-blue-50 text-blue-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    secondary: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
