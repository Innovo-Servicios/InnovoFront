import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  CircularProgress,
  Card,
  CardBody,
  Divider,
  Chip,
  Button,
} from "@heroui/react";
import {
  Bell,
  Calendar,
  Clock,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";

interface Notification {
  id?: number | string;
  _id?: number | string;
  titulo: string;
  mensaje: string;
  contenido: string;
  fecha: string;
  requiereFirma?: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  notification: Notification | null;
  onClose: () => void;
}

interface Follow {
  trabajadorId?: string;
  rut: string;
  nombre: string;
}

interface ValidationItem extends Follow {
  estado: string;
  expiresAt?: string | null;
  firmadoAt?: string | null;
  aceptadoAt?: string | null;
  intentos?: number;
}

interface ValidationDetails {
  required: boolean;
  resumen: {
    pendientes: number;
    firmados: number;
    aceptados: number;
    vencidos: number;
    bloqueados: number;
  };
  pendientes: ValidationItem[];
  firmados: ValidationItem[];
  aceptados: ValidationItem[];
  vencidos: ValidationItem[];
  bloqueados: ValidationItem[];
}

const emptyValidation: ValidationDetails = {
  required: false,
  resumen: {
    pendientes: 0,
    firmados: 0,
    aceptados: 0,
    vencidos: 0,
    bloqueados: 0,
  },
  pendientes: [],
  firmados: [],
  aceptados: [],
  vencidos: [],
  bloqueados: [],
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CL");
};

export default function NotificationModal({
  isOpen,
  notification,
  onClose,
}: NotificationModalProps) {
  const { token, authenticatedFetch } = useAuth();
  const [check, setCheck] = useState<Follow[]>([]);
  const [noCheck, setNoCheck] = useState<Follow[]>([]);
  const [validation, setValidation] = useState<ValidationDetails>(emptyValidation);
  const [porcent, setPorcecnt] = useState(0);
  const [regeneratingWorker, setRegeneratingWorker] = useState<string | null>(null);

  const notificationId = useMemo(
    () => notification?.id || notification?._id || null,
    [notification]
  );

  const fetchNotificationDetails = useCallback(async () => {
    if (!token || !notificationId) return;

    const data = {
      token,
      idNotificacion: notificationId,
    };

    try {
      const response = await authenticatedFetch(
        `${URL}/notificaciones/detallesNotificacion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const res = await response.json();
      const vistos = Array.isArray(res.vista) ? res.vista : [];
      const noVistos = Array.isArray(res.no_vista) ? res.no_vista : [];
      setCheck(vistos);
      setNoCheck(noVistos);
      setValidation(res.validacion || emptyValidation);
      const total = vistos.length + noVistos.length;
      const nextPorcent =
        total > 0 ? Number(((vistos.length / total) * 100).toFixed(1)) : 0;
      setPorcecnt(nextPorcent);
    } catch (error) {
      console.error("Error fetching notification details:", error);
    }
  }, [authenticatedFetch, notificationId, token]);

  useEffect(() => {
    fetchNotificationDetails();
  }, [fetchNotificationDetails]);

  const handleRegenerateCode = async (item: ValidationItem) => {
    if (!token || !notificationId || !item.trabajadorId) return;

    setRegeneratingWorker(item.trabajadorId);
    try {
      const response = await authenticatedFetch(
        `${URL}/notificaciones/validacion/regenerarCodigo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            idNotificacion: notificationId,
            trabajadorId: item.trabajadorId,
          }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        alert(message || "No se pudo regenerar el código.");
        return;
      }

      const payload = await response.json();
      alert(
        `Nuevo código para ${payload.codigo?.nombre || item.nombre}: ${
          payload.codigo?.code || "-"
        }`
      );
      await fetchNotificationDetails();
    } catch (error) {
      alert("No se pudo regenerar el código.");
    } finally {
      setRegeneratingWorker(null);
    }
  };

  const renderValidationList = (
    title: string,
    items: ValidationItem[],
    color: "primary" | "success" | "warning" | "danger" | "default",
    canRegenerate = false
  ) => (
    <Card className="min-h-40">
      <CardBody className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-800">{title}</span>
          <Chip size="sm" color={color} variant="flat">
            {items.length}
          </Chip>
        </div>
        <Divider />
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={`${title}-${item.trabajadorId || item.rut}`}
                className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{item.nombre}</p>
                    <p className="text-xs text-slate-500">{item.rut}</p>
                    {item.expiresAt ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Vence: {formatDateTime(item.expiresAt)}
                      </p>
                    ) : null}
                  </div>

                  {canRegenerate ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      color="primary"
                      aria-label="Regenerar código"
                      isLoading={regeneratingWorker === item.trabajadorId}
                      onPress={() => handleRegenerateCode(item)}
                    >
                      <RefreshCw size={15} />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Sin registros.</p>
        )}
      </CardBody>
    </Card>
  );

  if (!notification) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <span className="text-xl">{notification.titulo}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="mt-4 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-md md:flex-row">
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg font-semibold">Mensaje:</h3>
              <p className="text-gray-600">{notification.mensaje}</p>
              <div className="mt-4">
                <h3 className="mb-2 text-lg font-semibold">Contenido:</h3>
                <p>{notification.contenido}</p>
              </div>
            </div>
            <div className="flex justify-center md:w-[30%]">
              <CircularProgress
                aria-label="Porcentaje de visualización"
                classNames={{
                  svg: "w-36 h-36 drop-shadow-md",
                  indicator: "stroke-blue-500",
                  track: "stroke-gray-400/10",
                  value: "text-3xl font-semibold",
                }}
                value={porcent}
                strokeWidth={4}
                showValueLabel
                valueLabel={<span>{porcent}%</span>}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-3">
            <Card>
              <CardBody className="flex flex-row items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{notification.fecha.split("T")[0]}</span>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex flex-row items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>{notification.fecha.split("T")[1]?.split(".")[0] || ""}</span>
              </CardBody>
            </Card>
            {validation.required ? (
              <Card>
                <CardBody className="flex flex-row items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  <span>Firma requerida</span>
                </CardBody>
              </Card>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardBody className="flex flex-col items-center gap-2">
                <UserRoundCheck className="w-8 text-primary" />
                <span>Visualizado</span>
                <Divider />
                <ul className="list-disc pl-5">
                  {check.map((item) => (
                    <li key={item.rut}>{item.nombre}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex flex-col items-center gap-2">
                <UserRoundX className="w-8 text-danger" />
                <span>Sin visualizar</span>
                <Divider />
                <ul className="list-disc pl-5">
                  {noCheck.map((item) => (
                    <li key={item.rut}>{item.nombre}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {validation.required ? (
            <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">
                    Validación por código
                  </h3>
                  <p className="text-sm text-emerald-700">
                    Seguimiento de firma y aceptación por destinatario.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip color="primary" variant="flat">
                    Pendientes {validation.resumen.pendientes}
                  </Chip>
                  <Chip color="warning" variant="flat">
                    Firmados {validation.resumen.firmados}
                  </Chip>
                  <Chip color="success" variant="flat">
                    Aceptados {validation.resumen.aceptados}
                  </Chip>
                  <Chip color="danger" variant="flat">
                    Vencidos {validation.resumen.vencidos}
                  </Chip>
                  <Chip color="danger" variant="flat">
                    Bloqueados {validation.resumen.bloqueados}
                  </Chip>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {renderValidationList("Pendientes", validation.pendientes, "primary", true)}
                {renderValidationList("Firmados", validation.firmados, "warning")}
                {renderValidationList("Aceptados", validation.aceptados, "success")}
                {renderValidationList(
                  "Vencidos",
                  validation.vencidos,
                  "danger",
                  true
                )}
                {renderValidationList(
                  "Bloqueados",
                  validation.bloqueados,
                  "danger",
                  true
                )}
              </div>
            </section>
          ) : null}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
