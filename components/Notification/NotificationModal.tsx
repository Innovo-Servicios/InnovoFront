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
  FileDown,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { sileo } from "sileo";
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
  firmaAutomatica?: boolean;
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
  fechaVista?: string | null;
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
  firmaAutomatica: boolean;
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
  firmaAutomatica: false,
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

const formatDateOnly = (value?: string | null) => {
  if (!value) return "-";

  const trimmed = String(value).trim();
  if (!trimmed) return "-";

  const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }

  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("es-CL");
  }

  return trimmed.split(/[T,\s]/)[0] || "-";
};

const normalizeMultilineText = (value?: string | null) =>
  String(value || "")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\r\n|\r/g, "\n");

const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const textToHtml = (value?: string | null) =>
  escapeHtml(normalizeMultilineText(value)).replace(/\n/g, "<br />");

const notificationDate = (notification: Notification) =>
  notification.fecha.split("T")[0] || "-";

const notificationTime = (notification: Notification) =>
  notification.fecha.split("T")[1]?.split(".")[0] || "-";

const renderPdfSimpleList = (items: Follow[]) => {
  if (items.length === 0) return '<p class="empty">Sin registros.</p>';

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item.nombre)}</li>`)
    .join("")}</ul>`;
};

const renderPdfValidationList = (
  title: string,
  items: ValidationItem[],
  showExpirationDateOnly = false
) => `
  <section class="card">
    <div class="card-title">
      <span>${escapeHtml(title)}</span>
      <strong>${items.length}</strong>
    </div>
    ${
      items.length > 0
        ? `<div class="worker-list">${items
            .map(
              (item) => `
                <div class="worker-row">
                  <p class="worker-name">${escapeHtml(item.nombre)}</p>
                  <p class="muted">${escapeHtml(item.rut)}</p>
                  ${
                    item.expiresAt
                      ? `<p class="muted">Vence: ${escapeHtml(
                          showExpirationDateOnly
                            ? formatDateOnly(item.expiresAt)
                            : formatDateTime(item.expiresAt)
                        )}</p>`
                      : ""
                  }
                </div>`
            )
            .join("")}</div>`
        : '<p class="empty">Sin registros.</p>'
    }
  </section>`;

const buildNotificationPdfHtml = ({
  notification,
  check,
  noCheck,
  validation,
  porcent,
}: {
  notification: Notification;
  check: Follow[];
  noCheck: Follow[];
  validation: ValidationDetails;
  porcent: number;
}) => {
  const signatureLabel = validation.firmaAutomatica
    ? "Firma automática"
    : "Firma requerida";

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(notification.titulo)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 28px;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
          background: #fff;
        }
        h1 { margin: 0 0 18px; font-size: 24px; }
        h2 { margin: 0 0 10px; font-size: 18px; }
        h3 { margin: 0; font-size: 14px; }
        p { margin: 0; line-height: 1.45; }
        ul { margin: 0; padding-left: 18px; }
        li { margin: 4px 0; }
        .section {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          margin-bottom: 14px;
          padding: 16px;
        }
        .content-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr 190px;
        }
        .percentage {
          align-items: center;
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          color: #1d4ed8;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 120px;
          text-align: center;
        }
        .percentage strong { font-size: 32px; }
        .meta-grid, .two-grid, .validation-grid {
          display: grid;
          gap: 10px;
        }
        .meta-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .two-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .validation-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
        }
        .card-title {
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          font-weight: 700;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 8px;
        }
        .worker-list { display: grid; gap: 8px; }
        .worker-row {
          background: #f8fafc;
          border-radius: 10px;
          padding: 9px 10px;
        }
        .worker-name { font-weight: 700; }
        .muted { color: #64748b; font-size: 12px; margin-top: 2px; }
        .empty { color: #64748b; font-size: 13px; }
        .notice {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }
        .signature {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .chip {
          background: #f1f5f9;
          border-radius: 999px;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 10px;
        }
        @media print {
          body { padding: 18px; }
          .section, .card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(notification.titulo)}</h1>

      <section class="section content-grid">
        <div>
          <h2>Mensaje:</h2>
          <p>${textToHtml(notification.mensaje)}</p>
          <div style="height: 14px;"></div>
          <h2>Contenido:</h2>
          <p>${textToHtml(notification.contenido)}</p>
        </div>
        <div class="percentage">
          <span>Porcentaje de visualización</span>
          <strong>${escapeHtml(porcent)}%</strong>
        </div>
      </section>

      <section class="meta-grid">
        <div class="card"><strong>Fecha</strong><p>${escapeHtml(
          notificationDate(notification)
        )}</p></div>
        <div class="card"><strong>Hora</strong><p>${escapeHtml(
          notificationTime(notification)
        )}</p></div>
        ${
          validation.required
            ? `<div class="card"><strong>Firma</strong><p>${escapeHtml(
                signatureLabel
              )}</p></div>`
            : ""
        }
      </section>

      ${
        !validation.firmaAutomatica
          ? `<section class="two-grid section">
              <div class="card">
                <div class="card-title"><span>Visualizado</span><strong>${check.length}</strong></div>
                ${renderPdfSimpleList(check)}
              </div>
              <div class="card">
                <div class="card-title"><span>Sin visualizar</span><strong>${noCheck.length}</strong></div>
                ${renderPdfSimpleList(noCheck)}
              </div>
            </section>`
          : `<section class="section notice">
              Esta notificación no fue enviada a los teléfonos ni agregada a las bandejas de los trabajadores.
            </section>`
      }

      ${
        validation.required
          ? `<section class="section signature">
              <h2>${
                validation.firmaAutomatica
                  ? "Firmas automáticas"
                  : "Validación por código"
              }</h2>
              <p>${
                validation.firmaAutomatica
                  ? "Registradas por todos los trabajadores al crear la notificación."
                  : "Seguimiento de firma y aceptación por destinatario."
              }</p>
              <div class="chips">
                <span class="chip">Pendientes ${validation.resumen.pendientes}</span>
                <span class="chip">Firmados ${validation.resumen.firmados}</span>
                <span class="chip">Firmada y Aceptada ${validation.resumen.aceptados}</span>
                <span class="chip">Vencidos ${validation.resumen.vencidos}</span>
                <span class="chip">Bloqueados ${validation.resumen.bloqueados}</span>
              </div>
              <div style="height: 12px;"></div>
              <div class="validation-grid">
                ${renderPdfValidationList("Pendientes", validation.pendientes)}
                ${renderPdfValidationList("Firmados", validation.firmados)}
                ${renderPdfValidationList(
                  "Firmada y Aceptada",
                  validation.aceptados,
                  true
                )}
                ${renderPdfValidationList("Vencidos", validation.vencidos)}
                ${renderPdfValidationList("Bloqueados", validation.bloqueados)}
              </div>
            </section>`
          : ""
      }
    </body>
  </html>`;
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

  const copyRegeneratedCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      sileo.success({
        title: "Código copiado",
        description: "Ya puedes compartirlo con el trabajador.",
      });
    } catch (error) {
      console.error("No se pudo copiar el código:", error);
      sileo.error({
        title: "No se pudo copiar",
        description: "Copia el código manualmente desde el aviso.",
      });
    }
  };

  const handleRegenerateCode = async (item: ValidationItem) => {
    if (!token || !notificationId || !item.trabajadorId) return;

    setRegeneratingWorker(item.trabajadorId);
    const regenerateRequest = async () => {
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
        throw new Error(message || "No se pudo regenerar el código.");
      }

      const payload = await response.json();
      await fetchNotificationDetails();
      return payload;
    };

    try {
      await sileo.promise(regenerateRequest(), {
        loading: {
          title: "Regenerando código",
          description: `Creando un nuevo código para ${item.nombre}.`,
        },
        success: {
          title: "Código regenerado",
        },
        action: (payload) => {
          const code = String(payload.codigo?.code || "-");
          return {
            title: "Código regenerado",
            description: `${payload.codigo?.nombre || item.nombre}: ${code}`,
            duration: 12000,
            button: {
              title: "Copiar",
              onClick: () => void copyRegeneratedCode(code),
            },
          };
        },
        error: (error) => ({
          title: "No se pudo regenerar el código",
          description:
            error instanceof Error ? error.message : "Inténtalo nuevamente.",
        }),
      });
    } catch (error) {
      console.error("No se pudo regenerar el código:", error);
    } finally {
      setRegeneratingWorker(null);
    }
  };

  const renderValidationList = (
    title: string,
    items: ValidationItem[],
    color: "primary" | "success" | "warning" | "danger" | "default",
    canRegenerate = false,
    showExpirationDateOnly = false
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
                        Vence:{" "}
                        {showExpirationDateOnly
                          ? formatDateOnly(item.expiresAt)
                          : formatDateTime(item.expiresAt)}
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

  const handleExportPdf = () => {
    if (!notification) return;

    const pdfWindow = window.open("", "_blank", "width=1000,height=800");

    if (!pdfWindow) {
      sileo.error({
        title: "No se pudo abrir el PDF",
        description:
          "Permite las ventanas emergentes del navegador e inténtalo nuevamente.",
      });
      return;
    }

    pdfWindow.opener = null;
    pdfWindow.document.open();
    pdfWindow.document.write(
      buildNotificationPdfHtml({
        notification,
        check,
        noCheck,
        validation,
        porcent,
      })
    );
    pdfWindow.document.close();
    pdfWindow.focus();
    pdfWindow.onafterprint = () => pdfWindow.close();
    window.setTimeout(() => {
      pdfWindow.focus();
      pdfWindow.print();
    }, 250);
  };

  if (!notification) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <span className="text-xl">{notification.titulo}</span>
          </div>
          <Button
            color="primary"
            size="sm"
            variant="flat"
            startContent={<FileDown size={16} />}
            onPress={handleExportPdf}
          >
            Exportar PDF
          </Button>
        </ModalHeader>
        <ModalBody>
          <div className="mt-4 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-md md:flex-row">
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg font-semibold">Mensaje:</h3>
              <p className="whitespace-pre-line break-words text-gray-600">
                {normalizeMultilineText(notification.mensaje)}
              </p>
              <div className="mt-4">
                <h3 className="mb-2 text-lg font-semibold">Contenido:</h3>
                <p className="whitespace-pre-line break-words">
                  {normalizeMultilineText(notification.contenido)}
                </p>
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
                  <span>
                    {validation.firmaAutomatica
                      ? "Firma automática"
                      : "Firma requerida"}
                  </span>
                </CardBody>
              </Card>
            ) : null}
          </div>

          {!validation.firmaAutomatica ? (
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
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Esta notificación no fue enviada a los teléfonos ni agregada a
              las bandejas de los trabajadores.
            </div>
          )}

          {validation.required ? (
            <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">
                    {validation.firmaAutomatica
                      ? "Firmas automáticas"
                      : "Validación por código"}
                  </h3>
                  <p className="text-sm text-emerald-700">
                    {validation.firmaAutomatica
                      ? "Registradas por todos los trabajadores al crear la notificación."
                      : "Seguimiento de firma y aceptación por destinatario."}
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
                    Firmada y Aceptada {validation.resumen.aceptados}
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
                {renderValidationList(
                  "Firmada y Aceptada",
                  validation.aceptados,
                  "success",
                  false,
                  true
                )}
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
