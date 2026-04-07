"use client";
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionItem,
  ScrollShadow,
  Tabs,
  Tab,
  Card,
  Input,
  CardBody,
  CardHeader,
  Divider,
  Chip,
  Progress,
  Button,
  SelectItem,
  Select,
  DatePicker,
  Image,
  DateRangePicker,
} from "@heroui/react";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  FileTextIcon,
  TruckIcon,
  BookOpenIcon,
  MessageSquareMore,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  DownloadIcon,
  Send,
} from "lucide-react";
import { parseDate } from "@internationalized/date";
import { I18nProvider } from "@react-aria/i18n";
//import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
interface ATE {
  id: string;
  comentario: string;
  foto: string;
  tipo: { _id: string; nombre: string };
  direccion: { _id: string; nombre: string };
  Trabajador: { _id: string; nombre: string };
  fecha_ate: string;
  fotografia: string;
  estado: boolean;
}

export default function ATETracker() {
  const [ates, setAtes] = useState<ATE[]>([]);
  const [filteredAtes, setFilteredAtes] = useState<ATE[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ate");
  const [selectedTypeSend, setSelectedSendType] = useState("novedadSend");
  const [dateRange, setDateRange] = useState({
    start: parseDate(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0]
    ),
    end: parseDate(new Date().toISOString().split("T")[0]),
  });
  const [dateRangeAte, setDateRangeAte] = useState({
    start: parseDate(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0]
    ),
    end: parseDate(new Date().toISOString().split("T")[0]),
  });
  const [selectedDate, setSelectedDate] = useState(
    parseDate(new Date().toISOString().split("T")[0])
  );
  const [selectedSendDate, setSelectedSendDate] = useState(
    parseDate(new Date().toISOString().split("T")[0])
  );
  const { socket, token } = useAuth();
  const fetchATEs = async () => {
    if (!token) return;
    const response = await fetch(`${URL}/middleware/obtenerATE_Adm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    setDateRangeAte({
      start: parseDate(new Date(data.fecha).toISOString().split("T")[0]),
      end: parseDate(new Date().toISOString().split("T")[0]),
    });
    setAtes(data.ate);
    console.log(data.ate);
  };
  useEffect(() => {
    fetchATEs();
  }, [token]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = ates.filter(
      (ate) =>
        ate.tipo.nombre.toLowerCase().includes(lowercasedFilter) ||
        ate.Trabajador.nombre.toLowerCase().includes(lowercasedFilter) ||
        ate.direccion.nombre.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredAtes(filtered);
  }, [searchTerm, ates]);
  useEffect(() => {
    if (socket) {
      socket.on("nuevaAte", () => {
        fetchATEs();
      });
    }
  }, [socket]);
  const getATETypeIcon = (type: string) => {
    switch (type) {
      case "Atención Especial-Reparto":
        return (
          <Chip variant="light" color="default">
            <TruckIcon size={24} />
          </Chip>
        );
      case "Atención Especial-Lectura":
        return (
          <Chip variant="light" color="default">
            <BookOpenIcon size={24} />
          </Chip>
        );
      default:
        return <FileTextIcon size={24} />;
    }
  };
  const getStatsData = () => {
    const totalAtes = ates.length;
    const completedAtes = ates.filter((ate) => ate.estado).length;
    const completionRate = (completedAtes / totalAtes) * 100;

    const typeStats = ates.reduce((acc, ate) => {
      acc[ate.tipo.nombre] = (acc[ate.tipo.nombre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const workerStats = ates.reduce((acc, ate) => {
      acc[ate.Trabajador.nombre] = (acc[ate.Trabajador.nombre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalAtes, completedAtes, completionRate, typeStats, workerStats };
  };
  const handleDownload = async () => {
    if (!dateRange.start || !dateRange.end || selectedType === "") {
      alert("Seleccione un rango de fechas y un tipo de datos");
      return;
    }
    try {
      if (selectedType === "ate") {
        const response = await fetch(`${URL}/excel/ate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fecha: selectedDate.toString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Error al descargar las estadísticas");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "AtencionesEspeciales.zip";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const response = await fetch(`${URL}/excel/novedad`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fechainicio: dateRange.start.toString(),
            fechafin: dateRange.end.toString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Error al descargar las estadísticas");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "Novedades.zip";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error al descargar las estadísticas:", error);
      // Aquí puedes manejar el error, por ejemplo, mostrando una notificación al usuario
    }
  };
  const sendNovedad = async () => {
    try {
      const response = await fetch(`${URL}/novedad/correo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: selectedSendDate.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar las novedades");
      }

      alert("Novedades enviadas correctamente");
    } catch (error) {
      console.error("Error al enviar las novedades:", error);
      // Aquí puedes manejar el error, por ejemplo, mostrando una notificación al usuario
    }
  };
  const sendVerificacion = async () => {
    try {
      const response = await fetch(`${URL}/novedad/verificacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: selectedSendDate.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar las verificaciones");
      }

      alert("Verificaciones enviadas correctamente");
    } catch (error) {
      console.error("Error al enviar las verificaciones:", error);
      // Aquí puedes manejar el error, por ejemplo, mostrando una notificación al usuario
    }
  };
  const SendData = async () => {
    if (!selectedSendDate || selectedTypeSend === "") {
      alert("Seleccione una fecha y un tipo de datos");
      return;
    }
    if (selectedTypeSend === "novedadSend") {
      sendNovedad();
    } else {
      sendVerificacion();
    }
  };
  const downloadFile = (fileUri: string, fileName: string) => {
    try {
      const parsedUri = new window.URL(fileUri, window.location.origin);
      const allowedBase = new window.URL(URL, window.location.origin);
      const allowedPath =
        allowedBase.pathname === "/" ? "/" : allowedBase.pathname;

      if (!["http:", "https:"].includes(parsedUri.protocol)) {
        throw new Error("Protocolo de archivo no permitido");
      }
      if (parsedUri.origin !== allowedBase.origin) {
        throw new Error("Origen de archivo no permitido para evitar SSRF");
      }
      if (allowedPath !== "/" && !parsedUri.pathname.startsWith(allowedPath)) {
        throw new Error("Ruta de archivo no permitida");
      }

      const link = document.createElement("a");
      link.href = parsedUri.toString();
      link.setAttribute("download", fileName); // Forzar la descarga con el nombre original
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
    }
  };
  const changeListAte = async (value: any) => {
    if (!token) return;
    const fechas = {
      inicio: value.start.toString(),
      fin: value.end.toString(),
    };
    const response = await fetch(`${URL}/middleware/obtenerATE_Adm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, fecha: fechas }),
    });
    const data = await response.json();
    setDateRangeAte({
      start: parseDate(value.start.toString()),
      end: parseDate(value.end.toString()),
    });
    setAtes(data.ate);
  };
  return (
    <Card className="w-full h-full ">
      <CardHeader className="flex flex-col gap-2 w-full ">
        <h1 className="text-2xl font-bold text-gray-800">
          Seguimiento de Atenciones Especiales
        </h1>
        <p className="text-sm text-gray-500">
          Visualiza y gestiona las ATEs asignadas
        </p>
        <div className="flex space-x-2 w-full mt-2">
          {/**"flat" | "faded" | "bordered" | "underlined" */}
          <Input
            aria-label="Buscar ATE"
            placeholder="Buscar por trabajador o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="md"
            variant="bordered"
          />
        </div>
      </CardHeader>
      <CardBody className="flex flex-col p-0 scrollbar-hide">
        <Tabs
          aria-label="ATE Visualization Options"
          className="w-full p-3 scrollbar-hide"
        >
          <Tab key="stats" title="Vista General" aria-label="Stats">
            <Divider />
            <ScrollShadow hideScrollBar className="w-full p-4">
              {(() => {
                const {
                  totalAtes,
                  completedAtes,
                  completionRate,
                  typeStats,
                  workerStats,
                } = getStatsData();
                return (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold ">
                          Resumen General
                        </h2>
                        <I18nProvider locale="es-CL">
                          <DateRangePicker
                            className="max-w-[50%]"
                            label="Rango de fechas"
                            value={{
                              start: dateRangeAte.start,
                              end: dateRangeAte.end,
                            }}
                            size="md"
                            variant="bordered"
                            onChange={(value) => {
                              if (value) {
                                changeListAte(value);
                              }
                            }}
                          />
                        </I18nProvider>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardBody>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Total ATEs
                                </p>
                                <p className="text-2xl font-bold">
                                  {totalAtes}
                                </p>
                              </div>
                              <FileTextIcon
                                size={24}
                                className="text-blue-500"
                              />
                            </div>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Completadas
                                </p>
                                <p className="text-2xl font-bold">
                                  {completedAtes}
                                </p>
                              </div>
                              <CheckCircleIcon
                                size={24}
                                className="text-green-500"
                              />
                            </div>
                          </CardBody>
                        </Card>
                        <Card>
                          <CardBody>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Pendientes
                                </p>
                                <p className="text-2xl font-bold">
                                  {totalAtes - completedAtes}
                                </p>
                              </div>
                              <ClockIcon
                                size={24}
                                className="text-yellow-500"
                              />
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Tasa de Finalización
                      </h3>
                      <Progress
                        aria-label="Tasa de Finalización"
                        size="lg"
                        value={completionRate}
                        color="success"
                        showValueLabel={true}
                        className="max-w-md"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Distribución por Tipo
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(typeStats).map(([type, count]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              {getATETypeIcon(type)}
                              <span className="ml-2">{type}</span>
                            </div>
                            <Chip>{count as React.ReactNode}</Chip>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Top Trabajadores
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(workerStats)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([worker, count]) => (
                            <div
                              key={worker}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <UsersIcon size={18} />
                                <span className="ml-2">{worker}</span>
                              </div>
                              <Chip>{count} ATEs</Chip>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </ScrollShadow>
          </Tab>
          <Tab key="Ate" title="Atenciones Especiales" aria-label="ATE List">
            <Divider />
            <ScrollShadow hideScrollBar className="w-full">
              <Accordion
                className="scrollbar-hide mb-4 py-4"
                variant="splitted"
              >
                {filteredAtes.map((ate) => (
                  <AccordionItem
                    key={ate.id}
                    id="ate"
                    aria-label={`ATE`}
                    title={
                      <div className="flex justify-between items-center">
                        <div className="flex items-center justify-start gap-2">
                          {getATETypeIcon(ate.tipo.nombre)}
                          <span className="font-semibold">
                            {ate.tipo.nombre.split("Atención Especial-")[1]}
                          </span>
                          <Chip size="sm" color="default" variant="flat">
                            {ate.fecha_ate.split("T")[0]}
                          </Chip>
                        </div>
                        <Chip
                          color={ate.estado ? "success" : "warning"}
                          variant="flat"
                        >
                          {ate.estado ? "Completado" : "Pendiente"}
                        </Chip>
                      </div>
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2 text-sm text-gray-500 gap-2">
                        <CalendarIcon size={18} />
                        <span>{new Date(ate.fecha_ate).toLocaleString()}</span>
                      </div>
                      <div className="flex items-start space-x-2 text-sm text-gray-500 gap-2">
                        <UserIcon size={18} />
                        <span>{ate.Trabajador.nombre}</span>
                      </div>
                      <div className="flex items-start space-x-2 text-sm text-gray-500 gap-2">
                        <MapPinIcon size={18} />
                        <span>{ate.direccion.nombre}</span>
                      </div>
                      {ate.comentario && (
                        <div className="flex items-start space-x-2 text-sm text-gray-500 gap-2">
                          <MessageSquareMore
                            size={18}
                            className="flex-shrink-0 mt-1"
                          />
                          <span className="flex-grow">{ate.comentario}</span>
                        </div>
                      )}
                      {ate.fotografia && (
                        <div className="flex flex-col w-full justify-center items-center space-x-2 text-sm text-gray-500 gap-2">
                          <Divider />
                          <Image
                            src={`${URL}/${ate.fotografia}`}
                            isZoomed
                            alt="Fotografía de la ATE"
                            width={300}
                            height={300}
                            className=" mt-4 shadow-lg border border-gray-200 mb-4"
                            onClick={() =>
                              downloadFile(
                                `${URL}/${ate.fotografia}`,
                                "FotografiaATE"
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollShadow>
          </Tab>
          <Tab
            key="download&send"
            title="Enviar y descargar"
            aria-label="Download Stats"
          >
            <Divider />
            <ScrollShadow hideScrollBar className="w-full p-4">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Descargar datos</h2>
                <div className="flex flex-col md:flex-row gap-4">
                  {selectedType === "ate" ? (
                    <I18nProvider locale="es-CL">
                      <DatePicker
                        label="Fecha"
                        value={selectedDate}
                        variant="bordered"
                        onChange={(e) => {
                          if (e !== null) {
                            setSelectedDate(e);
                          }
                        }}
                      />
                    </I18nProvider>
                  ) : (
                    <I18nProvider locale="es-CL">
                      <DateRangePicker
                        className="max-w-[50%]"
                        label="Rango de fechas"
                        defaultValue={{
                          start: dateRange.start,
                          end: dateRange.end,
                        }}
                        size="md"
                        variant="bordered"
                        onChange={(value) => {
                          if (value) {
                            setDateRange({
                              start: value.start,
                              end: value.end,
                            });
                          }
                        }}
                      />
                    </I18nProvider>
                  )}
                  <Select
                    label="Tipo de datos"
                    placeholder="Seleccione el tipo de datos"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    defaultSelectedKeys={["ate"]}
                    className="max-w-[50%]"
                    variant="bordered"
                  >
                    <SelectItem key="ate" value="ate">
                      Atención especial
                    </SelectItem>
                    <SelectItem key="novedad" value="novedad">
                      Novedad
                    </SelectItem>
                  </Select>
                </div>
                <Button
                  color="primary"
                  endContent={<DownloadIcon size={16} />}
                  onPress={handleDownload}
                  disabled={!dateRange.start || !dateRange.end || !selectedDate}
                  variant="bordered"
                >
                  Descargar Estadísticas
                </Button>
              </div>
              <Divider className="my-4" />
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">
                  Enviar novedades asigandas
                </h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <I18nProvider locale="es-CL">
                    <DatePicker
                      label="Fecha de la asignación"
                      value={selectedSendDate}
                      variant="bordered"
                      onChange={(e) => {
                        if (e !== null) {
                          setSelectedSendDate(e);
                        }
                      }}
                    />
                  </I18nProvider>
                  <Select
                    label="Tipo de datos"
                    placeholder="Seleccione el tipo de datos"
                    value={selectedType}
                    onChange={(e) => setSelectedSendType(e.target.value)}
                    defaultSelectedKeys={["novedadSend"]}
                    className="max-w-[50%]"
                    variant="bordered"
                  >
                    <SelectItem key="novedadSend" value="novedadSend">
                      Novedad
                    </SelectItem>
                    <SelectItem key="verificacion" value="verificacion">
                      Verificación
                    </SelectItem>
                  </Select>
                </div>
                <Button
                  color="success"
                  endContent={<Send size={16} />}
                  onPress={SendData}
                  variant="bordered"
                >
                  Enviar datos
                </Button>
              </div>
            </ScrollShadow>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
}
