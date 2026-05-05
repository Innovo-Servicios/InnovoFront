import { useEffect, useState, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Tabs,
  Tab,
  Card,
  CardBody,
  Link,
  Chip,
  Divider,
  DatePicker,
  CardHeader,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Image,
  Button,
  DrawerFooter,
  Input,
  CardFooter,
  input,
  DateRangePicker,
} from "@heroui/react";
import { I18nProvider } from "@react-aria/i18n";
import { Spinner } from "@heroui/react";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
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
} from "lucide-react";
import { parseDate } from "@internationalized/date";
interface WorkerDetails {
  Nombre: string;
  Rut: string;
  cargo: string;
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
export default function Drawer_Worker({
  isOpen,
  onOpenChange,
  workerKey,
}: DrawerWorkerProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [worker, setWorker] = useState<WorkerDetails | null>(null);
  const { token, socket } = useAuth();
  const [nombre, setNombre] = useState<string>(""); // Nombre del trabajador
  const [correo, setCorreo] = useState<string>(""); // Correo del trabajador
  const [cargo, setCargo] = useState<string>(""); // Cargo del trabajador
  const [Mod, setMod] = useState<boolean>(false); // Modo de edición
  const [file, setFile] = useState<File | null>(null); // Archivo seleccionado
  const [tipoDocumentos, setTipoDocumentos] = useState<TipoDocumentos[]>([]);
  const [tipoDocumentosSelected, setTipoDocumentosSelected] =
    useState<string>("");
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
  const fetchWorker = async () => {
    const response = await fetch(`${URL}/trabajador/datosTrabajador`, {
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
    setCargo(data.cargo);
    console.log(data.cargo);
  };
  const fetchTipoDocumentos = async () => {
    const notVisible = [
      "679fcfe4d964658484179acf",
      "678840cf7e67e1e8c95c27bd",
      "67337993a35183c85300b0bb",
      "678840c57e67e1e8c95c27b9",
    ];
    const response = await fetch(`${URL}/tipoDocumento/obtenerTipos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    let data = await response.json();
    //quitar los elementos de data que coincidan su _id con uno de los elementos de la lista de noVisible
    data = data.filter((element: any) => !notVisible.includes(element._id));
    setTipoDocumentos(data);
  };
  const fetchSectores = async () => {
    const response = await fetch(`${URL}/sector/sectorApoyo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    setSectores(data);
  };
  useEffect(() => {
    if (isOpen && token) {
      fetchWorker();
      fetchTipoDocumentos();
      fetchSectores();
    }
  }, [isOpen, token]);
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
    if (window.confirm("¿Está seguro de que desea eliminar este documento?")) {
      const response = await fetch(`${URL}/documento/deleteDocumento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, id, rut }),
      });
      if (response.ok) {
        fetchWorker();
      } else {
        console.error("Error al eliminar el documento:", response.statusText);
      }
    }
  };
  const handleSendHelp = async () => {
    if (!worker) return;
    if (!sectorSelected) {
      alert("Seleccione un sector.");
      return;
    }
    const data = {
      token,
      sector: sectorSelected,
      fechainicio: dateRange.start.toString(),
      fechafin: dateRange.end.toString(),
    };
    const response = await fetch(`${URL}/asignacion/asignarApoyo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      alert("Apoyo asignado correctamente.");
      if (socket) {
        socket.emit("updateWorker");
      }
    } else {
      alert("Error al asignar el apoyo.");
      console.error("Error al asignar el apoyo:", response.statusText);
    }
  };
  const handleSendDocument = async () => {
    if (!worker || !token) return;
    const formData = new FormData();
    formData.append("file", file as Blob);
    formData.append("token", token);
    formData.append("objetivo", worker.Rut);
    formData.append("tipo", tipoDocumentosSelected);
    const response = await fetch(`${URL}/documento/crearDocumento`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (response.ok) {
      alert("Documento subido correctamente.");
      fetchWorker();
    } else {
      alert("Error al subir el documento.");
      console.error("Error al subir el documento:", response.statusText);
    }
  };
  function buildValidatedDownloadUrl(baseUrl: string, filePath: string): string {
    try {
      // Minimal path validation (Do this before new URL(baseUrl), as URL() resolves dot-segments.)
      if (baseUrl.includes('/../') || /\/%2e%2e\//i.test(baseUrl)) {
        throw new Error('Invalid path');
      }
      if (filePath.includes('/../') || /\/%2e%2e\//i.test(filePath)) {
        throw new Error('Invalid path');
      }
      
      const url = new window.URL(baseUrl);
      
      // Protocol + host checks (KEEP ONLY IF scheme/host may vary.)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      // Validate path parameters (KEEP ONLY IF original used path params.)
      if (!/^[A-Za-z0-9_\-\/\.]+$/.test(filePath)) {
        throw new Error('Invalid parameter');
      }
      
      // Rebuild pathname from fixed literals + validated segments.
      url.pathname = url.pathname.endsWith('/') ? url.pathname + filePath : url.pathname + '/' + filePath;
      
      return url.href;
    } catch {
      throw new Error('Invalid URL');
    }
  }

  const downloadFile = (fileUri: string, fileName: string) => {
    try {
      const validatedUrl = buildValidatedDownloadUrl(URL, fileUri.replace(URL + '/', ''));

      const link = document.createElement("a");
      link.href = validatedUrl;
      link.setAttribute("download", fileName); // Forzar la descarga con el nombre original
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
    }
  };
  const handlerMod = async () => {
    if (Mod) {
      if (!worker) return;
      if (
        nombre === worker.Nombre &&
        correo === worker.correo &&
        cargo === worker.cargo
      ) {
        alert("No se realizaron cambios.");
        setMod(!Mod);
        return;
      }
      const data = {
        token,
        rut: worker.Rut,
        Nuevonombre: nombre,
        Nuevocorreo: correo,
        Nuevocargo: cargo,
      };
      const response = await fetch(
        `${URL}/trabajador/modificardatostrabajador`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (response.ok) {
        alert("Datos modificados correctamente");
        setMod(!Mod);
        if (socket) {
          socket.emit("updateWorker");
        }
      } else {
        alert("Error al modificar los datos del trabajador");
        console.error("Error al modificar los datos del trabajador");
      }
    } else {
      setMod(!Mod);
    }
  };
  const handleDelete = async (rut:string) => {
      if (!token) return;
      if (window.confirm("¿Está seguro de que desea eliminar este trabajador?")) {
        const res = await fetch(`${URL}/trabajador/eliminartrabajador`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, rut }), // Incluye el token y el rut en el cuerpo de la solicitud
        });
  
        if (res.ok) {
          alert("Trabajador eliminado correctamente.");
          if (socket) {
            socket.emit("updateWorker");
          }
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
        setCargo("");
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
                                label="Cargo"
                                selectedKeys={[cargo]}
                                isDisabled={!Mod}
                                variant="bordered"
                                startContent={
                                  <Briefcase className="text-default-400 pointer-events-none flex-shrink-0" />
                                }
                                onChange={(e) => {setCargo(e.target.value)}}
                              >
                                <SelectItem key="administracion">
                                  Administración
                                </SelectItem>
                                <SelectItem key="lector">Lector</SelectItem>
                                <SelectItem key="supervisor">
                                  Supervisor
                                </SelectItem>
                                <SelectItem key="inspector">
                                  Inspector
                                </SelectItem>
                              </Select>
                            </div>
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
                                    <Image
                                      src={`${URL}/${novedad.Fotografia}`}
                                      isZoomed
                                      alt="Fotografía de la ATE"
                                      width={300}
                                      height={300}
                                      className=" mt-4 shadow-lg border border-gray-200 mb-4"
                                      onClick={() =>
                                        downloadFile(
                                          `${URL}/${novedad.Fotografia}`,
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
                      )}
                    </CardBody>
                  </Card>
                </Tab>
                <Tab key="documents" title="Documentos">
                  {worker.documentos.map((doc) => (
                    <div key={doc._id} className="mb-4 shadow-xl rounded-lg">
                      <div className="w-full rounded-t-lg bg-[#fdedd3] justify-between flex items-center p-2">
                        <Link
                          href={`${URL}${doc.url}?access_token=${encodeURIComponent(
                            token || ""
                          )}`}
                          showAnchorIcon
                          isExternal
                          anchorIcon={
                            <ExternalLink size={20} color="#3b82f6" />
                          }
                          className="flex flex-row items-center justify-center gap-2"
                        >
                          <h3 className="text-black text-lg font-semibold">
                            {/* */}
                            {doc.tipo?.value || "Tipo no disponible"}
                          </h3>
                        </Link>
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
            <div className="flex flex-row gap-4 w-full">
              <div className="w-2/5">
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
              <Select
                className="w-2/5"
                label="Seleccione tipo"
                size="sm"
                variant="bordered"
                onChange={(e) => setTipoDocumentosSelected(e.target.value)}
              >
                {tipoDocumentos.map((tipo) => (
                  <SelectItem key={tipo._id}>{tipo.value}</SelectItem>
                ))}
              </Select>
              <Button
                className="w-1/5 p-0"
                size="lg"
                variant="flat"
                color={!file || !tipoDocumentosSelected ? "default" : "success"}
                startContent={<Send size={24} />}
                onPress={handleSendDocument}
                isDisabled={!file || !tipoDocumentosSelected}
              >
                Subir
              </Button>
            </div>
          </DrawerFooter>
        )}
        {activeTab === "details" && (
          <DrawerFooter className="flex flex-col gap-4">
            <Button
              className="w-full p-2 gap-4 flex flex-row justify-center text-sm"
              onPress={() => worker && handleDelete(worker.Rut)}
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
