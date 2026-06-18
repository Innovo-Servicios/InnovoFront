"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../../styles/rutas.module.css";
import NewsTab from "@/components/News/News_tab";
import { useAuth } from "@/app/AuthContext";
import { URL } from "@/config/config";
import { parseDate, CalendarDate } from "@internationalized/date";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { I18nProvider } from "@react-aria/i18n";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DateRangePicker,
  Chip,
} from "@heroui/react";
import {
  ListFilter,
  Search,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import ATETracker from "@/components/News/ATETracker";

interface Novedad {
  id: string;
  TipoNovedad: string;
  Fotografia: string | string[] | null;
  Lecturacorrecta?: number | null;
  lecturaCaldera?: number | null;
  lecturaCorrector?: number | null;
  Comentario?: string | null;
  Fecha: string;
  direccion: string;
}

interface TipoNovedad {
  _id: string;
  value: string;
}

type DateRangeValue = {
  start: CalendarDate;
  end: CalendarDate;
};

type QuickDateFilter = "today" | "last7" | "month" | "custom";

const toCalendarDate = (date: Date) => {
  return parseDate(date.toISOString().split("T")[0]);
};

const getTodayRange = (): DateRangeValue => {
  const today = new Date();

  return {
    start: toCalendarDate(today),
    end: toCalendarDate(today),
  };
};

const getLastSevenDaysRange = (): DateRangeValue => {
  const today = new Date();
  const sevenDaysAgo = new Date();

  sevenDaysAgo.setDate(today.getDate() - 6);

  return {
    start: toCalendarDate(sevenDaysAgo),
    end: toCalendarDate(today),
  };
};

const getCurrentMonthRange = (): DateRangeValue => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    start: toCalendarDate(firstDayOfMonth),
    end: toCalendarDate(lastDayOfMonth),
  };
};

export default function Admin_Novedades() {
  const { token, socket, authenticatedFetch } = useAuth();

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [tipoNovedades, setTipoNovedades] = useState<TipoNovedad[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(["all"])
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(getTodayRange);
  const [quickDateFilter, setQuickDateFilter] =
    useState<QuickDateFilter>("today");

  const fetchNovedades = useCallback(async () => {
    if (!token) return;

    try {
      const datos_body = {
        token,
        inicio: dateRange.start.toString(),
        fin: dateRange.end.toString(),
      };

      const response = await authenticatedFetch(`${URL}/novedad/UltimasNovedadesDia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos_body),
        cache: "no-store",
      });

      const data = await response.json();
      setNovedades(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching novedades:", error);
      setNovedades([]);
    }
  }, [authenticatedFetch, token, dateRange.start, dateRange.end]);

  const fetchType = useCallback(async () => {
    if (!token) return;

    try {
      const response = await authenticatedFetch(`${URL}/tiponovedad/obtenerTipoNovedad`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });

      const data = await response.json();

      if (!Array.isArray(data)) {
        setTipoNovedades([{ _id: "all", value: "Todos" }]);
        return;
      }

      const tiposFiltrados = data.filter(
        (tipo: { value: string }) =>
          tipo.value !== "Atención Especial-Lectura" &&
          tipo.value !== "Atención Especial-Reparto"
      );

      setTipoNovedades([{ _id: "all", value: "Todos" }, ...tiposFiltrados]);
    } catch (error) {
      console.error("Error fetching tipos de novedades:", error);
      setTipoNovedades([{ _id: "all", value: "Todos" }]);
    }
  }, [authenticatedFetch, token]);

  useEffect(() => {
    setDateRange(getTodayRange());
    setQuickDateFilter("today");
  }, []);

  useEffect(() => {
    fetchType();
  }, [fetchType]);

  useEffect(() => {
    fetchNovedades();
  }, [fetchNovedades]);

  useEffect(() => {
    if (!socket || !token) return;

    const handleActualizarNovedad = (newNovedad: Novedad) => {
      setNovedades((prev) => [newNovedad, ...prev]);
    };

    socket.on("actualizarNovedad", handleActualizarNovedad);

    return () => {
      socket.off("actualizarNovedad", handleActualizarNovedad);
    };
  }, [token, socket]);

  const applyQuickDateFilter = (filter: QuickDateFilter) => {
    setQuickDateFilter(filter);

    if (filter === "today") {
      setDateRange(getTodayRange());
      return;
    }

    if (filter === "last7") {
      setDateRange(getLastSevenDaysRange());
      return;
    }

    if (filter === "month") {
      setDateRange(getCurrentMonthRange());
      return;
    }
  };

  const resetFilters = () => {
    setSearchValue("");
    setSelectedKeys(new Set(["all"]));
    setDateRange(getTodayRange());
    setQuickDateFilter("today");
  };

  const handleSelectionChange = (keys: Set<string>) => {
    const newSelectedKeys = new Set(keys);

    if (Array.from(newSelectedKeys).pop() === "all") {
      newSelectedKeys.clear();
      newSelectedKeys.add("all");
    }

    if (newSelectedKeys.has("all") && newSelectedKeys.size > 1) {
      newSelectedKeys.delete("all");
    }

    const allOtherSelected = tipoNovedades
      .filter((tipo) => tipo._id !== "all")
      .every((tipo) => newSelectedKeys.has(tipo._id));

    if (allOtherSelected) {
      newSelectedKeys.clear();
      newSelectedKeys.add("all");
    }

    if (newSelectedKeys.size === 0) {
      newSelectedKeys.add("all");
    }

    setSelectedKeys(newSelectedKeys);
  };

  const filteredNovedades = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) return novedades;

    return novedades.filter((novedad) => {
      return (
        novedad.TipoNovedad?.toLowerCase().includes(query) ||
        novedad.Comentario?.toLowerCase().includes(query) ||
        novedad.lecturaCaldera?.toString().includes(query) ||
        novedad.lecturaCorrector?.toString().includes(query) ||
        novedad.direccion?.toLowerCase().includes(query) ||
        novedad.Fecha?.toLowerCase().includes(query)
      );
    });
  }, [novedades, searchValue]);

  const getTypeButtonLabel = () => {
    if (selectedKeys.has("all")) return "Tipo";

    const selectedLabels = tipoNovedades
      .filter((tipo) => selectedKeys.has(tipo._id))
      .map((tipo) => tipo.value);

    if (selectedLabels.length === 1) return selectedLabels[0];

    return `${selectedLabels.length} tipos`;
  };

  return (
    <div className={styles.RutasDiv}>
      <div className={styles.divTab}>
        <div className="shrink-0 px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Administración de Novedades
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Busca, filtra y revisa las novedades registradas.
          </p>
        </div>

        <div className="shrink-0 px-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Input
                variant="bordered"
                placeholder="Buscar novedades..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                startContent={<Search size={18} className="text-default-400" />}
                type="search"
                classNames={{
                  base: "w-full max-w-[360px]",
                  mainWrapper: "w-full",
                  inputWrapper: "h-11 rounded-xl border-default-200 bg-white",
                  input: "text-sm",
                }}
              />

              <I18nProvider locale="es-CL">
                <DateRangePicker
                  label="Rango de fechas"
                  value={{
                    start: dateRange.start,
                    end: dateRange.end,
                  }}
                  onChange={(value) => {
                    if (value) {
                      setDateRange({
                        start: value.start,
                        end: value.end,
                      });
                      setQuickDateFilter("custom");
                    }
                  }}
                  variant="bordered"
                  classNames={{
                    base: "w-full max-w-[330px]",
                    inputWrapper: "h-11 rounded-xl border-default-200 bg-white",
                  }}
                />
              </I18nProvider>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="flat"
                    startContent={<ListFilter size={18} color="black" />}
                    className="h-11 min-w-[120px] rounded-xl"
                  >
                    {getTypeButtonLabel()}
                  </Button>
                </DropdownTrigger>

                <DropdownMenu
                  aria-label="Filtrar por Tipo"
                  selectionMode="multiple"
                  selectedKeys={selectedKeys}
                  closeOnSelect={false}
                  onSelectionChange={(keys) =>
                    handleSelectionChange(new Set(keys as Set<string>))
                  }
                >
                  {tipoNovedades.map((tipo) => (
                    <DropdownItem key={tipo._id}>{tipo.value}</DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>

              <Button
                isIconOnly
                variant="flat"
                className="h-11 w-11 rounded-xl"
                onPress={resetFilters}
                aria-label="Restablecer filtros"
              >
                <RotateCcw size={18} />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={quickDateFilter === "today" ? "solid" : "flat"}
              color={quickDateFilter === "today" ? "primary" : "default"}
              className="rounded-xl font-semibold"
              startContent={<CalendarDays size={15} />}
              onPress={() => applyQuickDateFilter("today")}
            >
              Hoy
            </Button>

            <Button
              size="sm"
              variant={quickDateFilter === "last7" ? "solid" : "flat"}
              color={quickDateFilter === "last7" ? "primary" : "default"}
              className="rounded-xl font-semibold"
              onPress={() => applyQuickDateFilter("last7")}
            >
              Últimos 7 días
            </Button>

            <Button
              size="sm"
              variant={quickDateFilter === "month" ? "solid" : "flat"}
              color={quickDateFilter === "month" ? "primary" : "default"}
              className="rounded-xl font-semibold"
              onPress={() => applyQuickDateFilter("month")}
            >
              Este mes
            </Button>

            {quickDateFilter === "custom" && (
              <Chip color="primary" variant="flat" className="font-medium">
                Rango personalizado
              </Chip>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 px-4 pb-4">
          <NewsTab
            novedades={filteredNovedades}
            tiponovedad={tipoNovedades}
            selectedKeys={selectedKeys}
          />
        </div>
      </div>

      <div className={styles.divMenu}>
        <div className={styles.blq}>
          <ATETracker />
        </div>
      </div>
    </div>
  );
}
