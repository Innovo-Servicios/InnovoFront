import { useCallback, useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Tabs,
  Tab,
  Card,
  CardBody,
  Chip,
  Divider,
  DatePicker,
  CardHeader,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Button,
  DrawerFooter,
  Input,
  CardFooter,
  input,
  DateRangePicker,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { I18nProvider } from "@react-aria/i18n";
import { Spinner } from "@heroui/react";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
import AuthenticatedImage from "@/components/common/AuthenticatedImage";
import { downloadAuthenticatedFile } from "@/lib/authenticatedFiles";
import {
  File,
  Check,
  CheckCheck,
  LinkIcon,
  MessageSquare,
  CircleAlert,
  CalendarIcon,
  MapPinIcon,
  MessageSquareMore,
  Clock,
  Gauge,
  X,
  FileUp,
  User,
  Mail,
  Briefcase,
  UserCog,
  Send,
  FileCheck,
  ExternalLink,
  Calendar,
  Hash,
  Save,
  UserRoundX,
  Plus,
} from "lucide-react";
import { parseDate } from "@internationalized/date";
import { sileo } from "sileo";
import {
  assignTemporaryWorkerRole,
  assignWorkerRole,
  getRoles,
  removeTemporaryWorkerRole,
} from "@/api/adm/accessControl";
import type { AccessRole } from "@/lib/accessControl";
import { ARCHETYPE_LABELS } from "@/lib/accessControl";
interface WorkerDetails {
  _id: string;
  Nombre: string;
  Rut: string;
  cargo: string;
  arquetipo?: "administracion" | "lector" | "supervisor" | "inspector";
  rol?: { id: string; nombre: string; arquetipo: string } | null;
  rolTemporal?: {
    rol?: { id: string; nombre: string; arquetipo: string } | null;
    expiracion?: string;
  } | null;
  correo: string;
  lastUbication?: {
    lat: number;
    lng: number;
    date: { $date: number };
  } | null;
  notificaciones: {
    _id: string;
    estado: "visto" | "enviado";
    tipo:
      | { _id: string; value: "msg" }
      | { _id: string; value: "document" }
      | { _id: string; value: "alert" };
    titulo: string;
    mensaje: string;
  }[];
  documentos: {
    _id: string;
    nombreOriginal?: string;
    tipo?: { _id: string; value: string };
    url: string;
    formato: string;
    fecha: string;
  }[];
  novedades: {
    _id: string;
    TipoNovedad: { _id: string; value: string };
    Comentario: string;
    Lecturacorrecta: number;
    Fotografia: string;
    Fecha: string;
    direccion: {
      _id: string;
      calle: string;
      numero: number;
      block: string;
      depto: string;
      comuna: string;
      ciudad: string;
      region: string;
      LAT: number;
      LNG: number;
      NumeroSector: string;
      NumeroMedidor: string;
      __v: number;
    };
    emisor: string;
  }[];
}
interface DrawerWorkerProps {
  isOpen: boolean;
  onOpenChange: () => void;
  onOpen: () => void;
  workerKey: string;
}
interface TipoDocumentos {
  _id: string;
  value: string;
}
interface Sectores {
  _id: string;
  sectorNombre: string;
}

const getFileNameFromDocumentUrl = (url?: string) => {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) return "";

  const lastSegment = rawUrl.split(/[\\/]/).filter(Boolean).pop() || "";
  const fileName = lastSegment.split("?")[0] || "";
  try {
    return decodeURIComponent(fileName).trim();
  } catch {
    return fileName.trim();
  }
};

const getWorkerDocumentDisplayName = (doc: WorkerDetails["documentos"][number]) =>
  doc.nombreOriginal?.trim() || getFileNameFromDocumentUrl(doc.url) || doc.tipo?.value || "Documento";

export default function Drawer_Worker({
  isOpen,
  onOpenChange,
  workerKey,
}: DrawerWorkerProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [worker, setWorker] = useState<WorkerDetails | null>(null);
  const { token, socket, authenticatedFetch, hasPermission } = useAuth();
  const [nombre, setNombre] = useState<string>(""); // Nombre del trabajador
  const [correo, setCorreo] = useState<string>(""); // Correo del trabajador
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [temporaryRoleId, setTemporaryRoleId] = useState("");
  const [temporaryExpiration, setTemporaryExpiration] = useState("");
  const [Mod, setMod] = useState<boolean>(false); // Modo de edición
  const [file, setFile] = useState<File | null>(null); // Archivo seleccionado
  const [tipoDocumentos, setTipoDocumentos] = useState<TipoDocumentos[]>([]);
  const [tipoDocumentosSelected, setTipoDocumentosSelected] =
    useState<string>("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [sectores, setSectores] = useState<Sectores[]>([]);
  const [sectorSelected, setSectorSelected] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateRange, setDateRange] = useState({
    start: parseDate(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0]
    ),
    end: parseDate(new Date().toISOString().split("T")[0]),
  });
  const fetchWorker = useCallback(async () => {
    const response = await authenticatedFetch(`${URL}/trabajador/datosTrabajador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({ token, rut: workerKey }),
    });
    const data = await response.json();
    setWorker(data);
    setNombre(data.Nombre);
    setCorreo(data.correo);
    setSelectedRoleId(data.rol?.id || "");
    setTemporaryRoleId(data.rolTemporal?.rol?.id || "");
  }, [authenticatedFetch, token, workerKey]);
  const fetchTipoDocumentos = useCallback(async () => {
    const notVisible = [
      "679fcfe4d964658484179acf",
      "678840cf7e67e1e8c95c27bd",
      "67337993a35183c85300b0bb",
      "678840c57e67e1e8c95c27b9",
    ];
    const response = await authenticatedFetch(`${URL}/tipoDocumento/obtenerTipos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    let data = await response.json();
    //quitar los elementos de data que coincidan su _id con uno de los elementos de la lista de noVisible
    data = data.filter((element: any) => !notVisible.includes(element._id));
    setTipoDocumentos(
      data.sort((a: TipoDocumentos, b: TipoDocumentos) =>
        a.value.localeCompare(b.value, "es", { sensitivity: "base" })
      )
    );
  }, [authenticatedFetch, token]);
  const fetchSectores = useCallback(async () => {
    const response = await authenticatedFetch(`${URL}/sector/sectorApoyo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    setSectores(data);
  }, [authenticatedFetch, token]);
  useEffect(() => {
    if (isOpen && token) {
      void fetchWorker();
      void fetchTipoDocumentos();
      void fetchSectores();
      getRoles(authenticatedFetch)
        .then((items) => setRoles(items.filter((role) => role.activo)))
        .catch(() => setRoles([]));
    }
  }, [authenticatedFetch, fetchSectores, fetchTipoDocumentos, fetchWorker, isOpen, token]);
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setFile(file);
  };
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const handleDeleteDocuments = async (id: string, rut: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este documento?")) {
      return;
    }

    const deleteRequest = async () => {
      const response = await authenticatedFetch(`${URL}/documento/deleteDocumento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, id, rut }),
      });

      if (!response.ok) {
        throw new Error("El servidor no pudo eliminar el documento.");
      }

      await fetchWorker();
    };

    try {
      await sileo.promise(deleteRequest(), {
        loading: { title: "Eliminando documento" },
        success: {
          title: "Documento eliminado",
          description: "El listado del trabajador fue actualizado.",
        },
        error: (error) => ({
          title: "No se pudo eliminar el documento",
          description:
            error instanceof Error ? error.message : "Inténtalo nuevamente.",
        }),
      });
    } catch (error) {
      console.error("Error al eliminar el documento:", error);
    }
  };
  const handleSendHelp = async () => {
    if (!worker) return;
    if (!sectorSelected) {
      sileo.warning({
        title: "Selecciona un sector",
        description: "El sector es necesario para asignar el apoyo.",
      });
      return;
    }
    const data = {
      token,
      sector: sectorSelected,
      fechainicio: dateRange.start.toString(),
      fechafin: dateRange.end.toString(),
    };
    const assignRequest = async () => {
      const response = await authenticatedFetch(`${URL}/asignacion/asignarApoyo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("El servidor no pudo asignar el apoyo.");
      }

      socket?.emit("updateWorker");
    };

    try {
      await sileo.promise(assignRequest(), {
        loading: { title: "Asignando apoyo" },
        success: {
          title: "Apoyo asignado",
          description: "El trabajador y su planificación fueron actualizados.",
        },
        error: (error) => ({
          title: "No se pudo asignar el apoyo",
          description:
            error instanceof Error ? error.message : "Inténtalo nuevamente.",
        }),
      });
    } catch (error) {
      console.error("Error al asignar el apoyo:", error);
    }
  };
  const handleSendDocument = async () => {
    if (!worker || !token) return;
    if (!file || !tipoDocumentosSelected) {
      sileo.warning({
        title: "Falta información del documento",
        description: "Selecciona un archivo y su tipo antes de subirlo.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("token", token);
    formData.append("objetivo", worker.Rut);
    formData.append("tipo", tipoDocumentosSelected);
    const uploadRequest = async () => {
      const response = await authenticatedFetch(`${URL}/documento/crearDocumento`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("El servidor no pudo guardar el documento.");
      }

      await fetchWorker();
    };

    try {
      await sileo.promise(uploadRequest(), {
        loading: { title: "Subiendo documento" },
        success: {
          title: "Documento subido",
          description: "Ya está disponible en la ficha del trabajador.",
        },
        error: (error) => ({
          title: "No se pudo subir el documento",
          description:
            error instanceof Error ? error.message : "Inténtalo nuevamente.",
        }),
      });
    } catch (error) {
      console.error("Error al subir el documento:", error);
    }
  };
  const handleCreateDocumentCategory = async () => {
    const value = newCategoryName.trim().replace(/\s+/g, " ");
    if (value.length < 2) return;

    setIsCreatingCategory(true);
    try {
      const response = await authenticatedFetch(`${URL}/tipoDocumento/crearTipo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, value }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "El servidor no pudo crear la categoría.");
      }

      const createdCategory = payload?.tipo as TipoDocumentos | undefined;
      await fetchTipoDocumentos();
      if (createdCategory?._id) setTipoDocumentosSelected(createdCategory._id);
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
      sileo.success({
        title: "Categoría creada",
        description: `${createdCategory?.value || value} quedó seleccionada para este documento.`,
      });
    } catch (error) {
      sileo.error({
        title: "No se pudo crear la categoría",
        description: error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };
  const handlerMod = async () => {
    if (Mod) {
      if (!worker) return;
      if (
        nombre === worker.Nombre &&
        correo === worker.correo &&
        selectedRoleId === worker.rol?.id
      ) {
        sileo.info({
          title: "Sin cambios pendientes",
          description: "Los datos del trabajador ya están actualizados.",
        });
        setMod(!Mod);
        return;
      }
      const data = {
        token,
        rut: worker.Rut,
        Nuevonombre: nombre,
        Nuevocorreo: correo,
      };
      const updateRequest = async () => {
        const response = await authenticatedFetch(
          `${URL}/trabajador/modificardatostrabajador`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error("El servidor no pudo guardar los cambios.");
        }

        if (selectedRoleId && selectedRoleId !== worker.rol?.id) {
          await assignWorkerRole(authenticatedFetch, worker._id, selectedRoleId);
        }
      };

      try {
        await sileo.promise(updateRequest(), {
          loading: { title: "Guardando cambios" },
          success: {
            title: "Trabajador actualizado",
            description: "Los datos se guardaron correctamente.",
          },
          error: (error) => ({
            title: "No se pudo actualizar el trabajador",
            description:
              error instanceof Error ? error.message : "Inténtalo nuevamente.",
          }),
        });
        setMod(false);
        await fetchWorker();
        socket?.emit("updateWorker");
      } catch (error) {
        console.error("Error al modificar los datos del trabajador:", error);
      }
    } else {
      setMod(!Mod);
    }
  };
  const handleTemporaryRole = async () => {
    if (!worker || !temporaryRoleId || !temporaryExpiration) return;
    try {
      await assignTemporaryWorkerRole(
        authenticatedFetch,
        worker._id,
        temporaryRoleId,
        new Date(temporaryExpiration).toISOString()
      );
      await fetchWorker();
      sileo.success({ title: "Rol temporal asignado" });
    } catch (error) {
      sileo.error({ title: "No se pudo asignar el rol temporal", description: error instanceof Error ? error.message : undefined });
    }
  };

  const handleRemoveTemporaryRole = async () => {
    if (!worker) return;
    try {
      await removeTemporaryWorkerRole(authenticatedFetch, worker._id);
      setTemporaryRoleId("");
      setTemporaryExpiration("");
      await fetchWorker();
      sileo.success({ title: "Rol temporal eliminado" });
    } catch (error) {
      sileo.error({ title: "No se pudo eliminar el rol temporal", description: error instanceof Error ? error.message : undefined });
    }
  };
  const handleDelete = async (rut:string) => {
    if (!token) return;
    if (window.confirm("¿Está seguro de que desea eliminar este trabajador?")) {
      const deleteRequest = async () => {
        const res = await authenticatedFetch(`${URL}/trabajador/eliminartrabajador`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, rut }), // Incluye el token y el rut en el cuerpo de la solicitud
        });

        if (!res.ok) {
          throw new Error("El servidor no pudo eliminar el trabajador.");
        }

        socket?.emit("updateWorker");
      };

      try {
        await sileo.promise(deleteRequest(), {
          loading: { title: "Eliminando trabajador" },
          success: {
            title: "Trabajador eliminado",
            description: "El listado fue actualizado correctamente.",
          },
          error: (error) => ({
            title: "No se pudo eliminar el trabajador",
            description:
              error instanceof Error ? error.message : "Inténtalo nuevamente.",
          }),
        });
      } catch (error) {
        console.error("Error al eliminar el trabajador:", error);
      }
    }
  };
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="right"
      size="xl"
      backdrop="blur"
      onClose={() => {
        setMod(false);
        setSectorSelected("");
        setFile(null);
        setTipoDocumentosSelected("");
        setNombre("");
        setCorreo("");
        setActiveTab("details");
      }}
    >
      <DrawerContent>
        {!worker ? (
          <>
            <DrawerHeader className="flex flex-row gap-1 align-middle justify-center">
              <h2 className="text-2xl font-bold">Trabajador:</h2>
            </DrawerHeader>
            <DrawerBody>
              <div className="flex justify-center items-center h-full">
                <Spinner size="lg" color="secondary" />
              </div>
            </DrawerBody>
          </>
        ) : (
          <>
            <DrawerHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">{worker.Nombre}</h2>
              <p className="text-small text-gray-500">{worker.Rut}</p>
            </DrawerHeader>
            <DrawerBody className="scrollbar-hide">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => key && setActiveTab(key.toString())}
                className="w-full flex justify-center"
              >
                <Tab key="details" title="Detalles">
                  <div className="grid grid-cols-1 gap-8">
                    <Card>
                      <CardBody>
                        <div className="flex flex-col space-y-4">
                          <div className="flex flex-row justify-between items-center gap-4">
                            <div>
                              <h1 className="text-xl font-bold">
                                Datos personales
                              </h1>
                              <p className="text-small text-gray-500 ml-2">
                                Presione el botón Modificar para habilitar
                                edición.
                              </p>
                            </div>
                            <Button
                              variant="flat"
                              size="md"
                              color={Mod ? "success" : "warning"}
                              className="w-[25%] gap-1 p-1 self-start"
                              onPress={handlerMod}
                              isDisabled={!hasPermission("trabajadores.editar")}
                              startContent={
                                Mod ? <Save size={24} /> : <UserCog size={24} />
                              }
                            >
                              {Mod ? "Guardar" : "Modificar"}
                            </Button>
                          </div>
                          <div className="flex flex-col p-4 gap-4">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="RUT"
                                value={worker.Rut}
                                readOnly
                                isDisabled
                                variant="bordered"
                                startContent={
                                  <User className="text-default-400 pointer-events-none flex-shrink-0" />
                                }
                              />
                              <Select
                                label="Rol"
                                selectedKeys={selectedRoleId ? [selectedRoleId] : []}
                                isDisabled={!Mod || !hasPermission("trabajadores.roles.asignar")}
                                variant="bordered"
                                startContent={
                                  <Briefcase className="text-default-400 pointer-events-none flex-shrink-0" />
                                }
                                onChange={(e) => {setSelectedRoleId(e.target.value)}}
                              >
                                {roles.map((role) => (
                                  <SelectItem key={role.id} textValue={role.nombre}>
                                    {role.nombre} · {ARCHETYPE_LABELS[role.arquetipo]}
                                  </SelectItem>
                                ))}
                              </Select>
                            </div>
                            {hasPermission("trabajadores.roles.temporales") && (
                              <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-3">
                                <p className="mb-3 text-sm font-semibold text-slate-700">Acceso temporal</p>
                                {worker.rolTemporal?.rol ? (
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm">
                                      <p className="font-medium">{worker.rolTemporal.rol.nombre}</p>
                                      <p className="text-slate-500">Hasta {worker.rolTemporal.expiracion ? new Date(worker.rolTemporal.expiracion).toLocaleString("es-CL") : "sin fecha"}</p>
                                    </div>
                                    <Button size="sm" color="danger" variant="light" onPress={handleRemoveTemporaryRole}>Quitar</Button>
                                  </div>
                                ) : (
                                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                    <Select
                                      size="sm"
                                      label="Rol temporal"
                                      selectedKeys={temporaryRoleId ? [temporaryRoleId] : []}
                                      onChange={(event) => setTemporaryRoleId(event.target.value)}
                                    >
                                      {roles
                                        .filter((role) => role.arquetipo === (worker.arquetipo || worker.cargo) && role.id !== worker.rol?.id)
                                        .map((role) => <SelectItem key={role.id}>{role.nombre}</SelectItem>)}
                                    </Select>
                                    <Input
                                      size="sm"
                                      type="datetime-local"
                                      label="Expira"
                                      value={temporaryExpiration}
                                      onValueChange={setTemporaryExpiration}
                                    />
                                    <Button size="sm" color="primary" className="self-end" isDisabled={!temporaryRoleId || !temporaryExpiration} onPress={handleTemporaryRole}>Asignar</Button>
                                  </div>
                                )}
                              </div>
                            )}
                            <Input
                              label="Nombre"
                              value={nombre}
                              variant="bordered"
                              onChange={(e) => setNombre(e.target.value)}
                              isDisabled={!Mod}
                              startContent={
                                <User className="text-default-400 pointer-events-none flex-shrink-0" />
                              }
                            />
                            <Input
                              label="Email"
                              value={correo}
                              isDisabled={!Mod}
                              variant="bordered"
                              onChange={(e) => setCorreo(e.target.value)}
                              startContent={
                                <Mail className="text-default-400 pointer-events-none flex-shrink-0" />
                              }
                            />
                          </div>
                          {worker.lastUbication&&(<Divider />)}
                          {worker.lastUbication && (
                            <div className="col-span-2">
                              <h3 className="text-lg font-semibold">
                                Última Ubicación
                              </h3>
                              <div className="grid grid-cols-2 gap-2 px-2 text-gray-600">
                                <p>Latitud: {worker.lastUbication.lat}</p>
                                <p>Longitud: {worker.lastUbication.lng}</p>
                                <p>
                                  Fecha:{" "}
                                  {
                                    worker.lastUbication.date
                                      .toString()
                                      .split("T")[0]
                                  }
                                </p>
                                <p>
                                  Hora:{" "}
                                  {
                                    worker.lastUbication.date
                                      .toString()
                                      .split("T")[1]
                                      .split(".")[0]
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardHeader
                        title="Asignación de apoyo"
                        className="flex flex-row gap-2 justify-between items-start"
                      >
                        <div className="flex flex-col gap-2">
                          <h1 className="text-xl font-bold">Asignar apoyo</h1>
                          <p className="text-small text-gray-500 ml-2">
                            Asigne un sector que requiera apoyo a este
                            trabajador.
                          </p>
                        </div>
                        <Button
                          variant="flat"
                          color="success"
                          size="md"
                          startContent={<Send size={24} />}
                          onPress={handleSendHelp}
                          isDisabled={!hasPermission("trabajadores.apoyos.gestionar")}
                        >
                          Asignar
                        </Button>
                      </CardHeader>
                      <CardBody className="flex flex-row px-8 gap-2 mb-4">
                        <I18nProvider locale="es-CL">
                          <DateRangePicker
                            label="Rango de fechas"
                            defaultValue={{
                              start: dateRange.start,
                              end: dateRange.end,
                            }}
                            className="max-w-xs"
                            onChange={(value) => {
                              if (value) {
                                setDateRange({
                                  start: value.start,
                                  end: value.end,
                                });
                              }
                            }}
                            variant="bordered"
                          />
                        </I18nProvider>
                        <Select
                          label="Sector"
                          variant="bordered"
                          className="max-w-xs"
                          items={sectores}
                          aria-label="Seleccione un sector"
                          placeholder="Seleccione un sector"
                          labelPlacement="inside"
                          onChange={(e) => setSectorSelected(e.target.value)}
                          startContent={
                            <MapPinIcon className="text-default-400 pointer-events-none flex-shrink-0" />
                          }
                        >
                          {sectores.map((sector) => (
                            <SelectItem key={sector._id}>
                              {sector.sectorNombre.length > 20
                              ? `${sector.sectorNombre.substring(0, 20)}...`
                              : sector.sectorNombre}
                            </SelectItem>
                          ))}
                        </Select>
                      </CardBody>
                    </Card>
                  </div>
                </Tab>
                <Tab key="noti" title="Notificaciones">
                  {worker.notificaciones.map((notif) => (
                    <Card
                      key={notif._id}
                      className="flex flex-row mb-4 p-2 border-b gap-4"
                    >
                      <Chip
                        variant="flat"
                        size="lg"
                        className="self-center"
                        color={
                          notif.tipo.value === "msg" ? "success" : "warning"
                        }
                      >
                        {notif.tipo.value === "msg" ? (
                          <MessageSquare size={28} />
                        ) : notif.tipo.value === "document" ? (
                          <File size={18} />
                        ) : (
                          <CircleAlert size={28} />
                        )}
                      </Chip>
                      <div className="flex flex-col w-full">
                        <p className="font-semibold mt-1">{notif.titulo}</p>
                        <Divider />
                        <p className="mt-1">{notif.mensaje}</p>
                      </div>
                      <Chip
                        className="self-end"
                        variant="flat"
                        color={notif.estado === "visto" ? "success" : "warning"}
                      >
                        {notif.estado === "visto" ? (
                          <CheckCheck size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                      </Chip>
                    </Card>
                  ))}
                </Tab>
                <Tab key="novedades" title="Novedades">
                  <Card>
                    <CardBody className="scrollbar-hide">
                      {worker.novedades.length === 0 ? (
                        <p className="text-center text-gray-500">
                          Este usuario no ha registrado novedades.
                        </p>
                      ) : (
                        <Accordion
                          className="scrollbar-hide mb-4 py-4"
                          variant="splitted"
                        >
                          {worker.novedades.map((novedad) => (
                            <AccordionItem
                              key={novedad._id}
                              id="ate"
                              aria-label={`Novedad ${novedad.TipoNovedad.value}`}
                              title={
                                <Chip size="md" color="warning" variant="flat">
                                  {novedad.TipoNovedad.value}
                                </Chip>
                              }
                            >
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-start space-x-2 text-md text-gray-500 gap-2">
                                    <CalendarIcon size={18} />
                                    <span>{novedad.Fecha.split("T")[0]}</span>
                                  </div>
                                  <div className="flex items-start space-x-2 text-md text-gray-500 gap-2">
                                    <Clock size={18} />
                                    <span>
                                      {
                                        novedad.Fecha.split("T")[1].split(
                                          "."
                                        )[0]
                                      }
                                    </span>
                                  </div>
                                  <div className="flex items-start space-x-2 text-md text-gray-500 gap-2">
                                    <Gauge size={18} />
                                    <span>{novedad.Lecturacorrecta}</span>
                                  </div>
                                  <div className="flex items-start space-x-2 text-md text-gray-500 gap-2">
                                    <MapPinIcon size={18} />
                                    <span>{novedad.direccion.calle}</span>
                                  </div>
                                </div>
                                {novedad.Comentario && (
                                  <div className="flex items-start space-x-2 text-md text-gray-500 gap-2">
                                    <MessageSquareMore
                                      size={18}
                                      className="flex-shrink-0 mt-1"
                                    />
                                    <span className="flex-grow">
                                      {novedad.Comentario}
                                    </span>
                                  </div>
                                )}
                                {novedad.Fotografia && (
                                  <div className="flex flex-col w-full justify-center items-center space-x-2">
                                    <Divider />
                                    <AuthenticatedImage
                                      filePath={novedad.Fotografia}
                                      isZoomed
                                      alt="Fotografía de la ATE"
                                      width={300}
                                      height={300}
                                      className=" mt-4 shadow-lg border border-gray-200 mb-4"
                                      downloadName="FotografiaATE"
                                    />
                                  </div>
                                )}
                              </div>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </CardBody>
                  </Card>
                </Tab>
                <Tab key="documents" title="Documentos">
                  {worker.documentos.map((doc) => (
                    <div key={doc._id} className="mb-4 shadow-xl rounded-lg">
                      <div className="w-full rounded-t-lg bg-[#fdedd3] justify-between flex items-center p-2">
                        <Button
                          variant="light"
                          className="flex min-w-0 flex-row items-center justify-start gap-2"
                          onPress={() =>
                            downloadAuthenticatedFile(
                              authenticatedFetch,
                              doc.url,
                              getWorkerDocumentDisplayName(doc)
                            ).catch((error) =>
                              console.error("Error al descargar el documento:", error)
                            )
                          }
                        >
                          <ExternalLink size={20} color="#3b82f6" />
                          <h3 className="max-w-[420px] truncate text-left text-lg font-semibold text-black" title={getWorkerDocumentDisplayName(doc)}>
                            {getWorkerDocumentDisplayName(doc)}
                          </h3>
                        </Button>
                        <div className="flex flex-row gap-2 justify-center items-center">
                          <Chip variant="solid" color="warning">
                            <p className="font-semibold">
                              {doc.formato.split("/")[1].toLocaleUpperCase()}
                            </p>
                          </Chip>
                          <Button
                            size="sm"
                            isIconOnly
                            variant="light"
                            color="danger"
                            isDisabled={!hasPermission("trabajadores.documentos.gestionar")}
                            onPress={() =>
                              handleDeleteDocuments(doc._id, worker.Rut)
                            }
                          >
                            <X size={24} />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 px-4 py-2 text-gray-500">
                        <p className="flex flex-row items-center justify-start gap-1">
                          <Calendar size={18} />
                          {doc.fecha.split("T")[0]}
                        </p>
                        <p className="flex flex-row items-center justify-start gap-1">
                          <Clock size={18} />
                          {doc.fecha.split("T")[1].split(".")[0]}
                        </p>
                        <p className="flex flex-row items-center justify-start gap-1">
                          <Hash size={18} />
                          {doc._id}
                        </p>
                        <p className="flex flex-row items-center justify-start gap-1">
                          <File size={18} />
                          {doc.tipo?.value || "Sin categoría"}
                        </p>
                      </div>
                    </div>
                  ))}
                </Tab>
              </Tabs>
            </DrawerBody>
          </>
        )}
        {activeTab === "documents" && (
          <DrawerFooter className="flex flex-col gap-4 border-t-1 border-gray-400">
            <div>
              <h1 className="text-lg font-semibold"> Documentos</h1>
              <p className="text-small text-gray-500">
                Agregue documentos a este trabajador.
              </p>
            </div>
            <div className="grid w-full gap-3 md:grid-cols-[2fr_2fr_1fr]">
              <div>
                <input
                  type="file"
                  id="file-input"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .pdf, .doc, .docx, .ppt, .pptx, .txt, .png, .jpg, .jpeg"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
                <Button
                  className="w-full p-2 gap-4 flex flex-row justify-start text-sm text-gray-500"
                  onPress={handleButtonClick}
                  color="default"
                  variant="bordered"
                  size="lg"
                  startContent={
                    file ? (
                      <FileCheck size={24} color="green" />
                    ) : (
                      <FileUp size={24} color="gray" />
                    )
                  }
                >
                  {file
                    ? `${file.name.substring(0, 12)}...${file.name
                        .split(".")
                        .pop()}`
                    : "Seleccionar archivo"}
                </Button>
              </div>
              <div className="flex min-w-0 gap-2">
                <Select
                  className="min-w-0 flex-1"
                  label="Categoría del documento"
                  size="sm"
                  variant="bordered"
                  selectedKeys={tipoDocumentosSelected ? [tipoDocumentosSelected] : []}
                  onChange={(e) => setTipoDocumentosSelected(e.target.value)}
                >
                  {tipoDocumentos.map((tipo) => (
                    <SelectItem key={tipo._id}>{tipo.value}</SelectItem>
                  ))}
                </Select>
                <Button
                  isIconOnly
                  size="lg"
                  variant="flat"
                  color="primary"
                  aria-label="Crear categoría de documento"
                  title="Crear categoría"
                  isDisabled={!hasPermission("trabajadores.documentos.gestionar")}
                  onPress={() => setIsCategoryModalOpen(true)}
                >
                  <Plus size={22} />
                </Button>
              </div>
              <Button
                className="p-0"
                size="lg"
                variant="flat"
                color={!file || !tipoDocumentosSelected ? "default" : "success"}
                startContent={<Send size={24} />}
                onPress={handleSendDocument}
                isDisabled={!file || !tipoDocumentosSelected || !hasPermission("trabajadores.documentos.gestionar")}
              >
                Subir
              </Button>
            </div>
          </DrawerFooter>
        )}
        <Modal
          isOpen={isCategoryModalOpen}
          onOpenChange={setIsCategoryModalOpen}
          placement="center"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Nueva categoría de documento</ModalHeader>
                <ModalBody>
                  <Input
                    autoFocus
                    label="Nombre"
                    placeholder="Ej. Certificación SEC"
                    value={newCategoryName}
                    onValueChange={setNewCategoryName}
                    maxLength={80}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newCategoryName.trim().length >= 2) {
                        event.preventDefault();
                        void handleCreateDocumentCategory();
                      }
                    }}
                  />
                  <p className="text-xs text-default-500">
                    La categoría quedará disponible para los documentos de todos los trabajadores.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    color="primary"
                    isLoading={isCreatingCategory}
                    isDisabled={newCategoryName.trim().length < 2}
                    onPress={() => void handleCreateDocumentCategory()}
                  >
                    Crear categoría
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        {activeTab === "details" && (
          <DrawerFooter className="flex flex-col gap-4">
            <Button
              className="w-full p-2 gap-4 flex flex-row justify-center text-sm"
              onPress={() => worker && handleDelete(worker.Rut)}
              isDisabled={!hasPermission("trabajadores.eliminar")}
              color="danger"
              variant="flat"
              size="lg"
              startContent={<UserRoundX size={24} color="red" />}
            >
              Eliminar trabajador
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
