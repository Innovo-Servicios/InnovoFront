"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { FileCheck, FileUp, Plus, Send, UsersRound } from "lucide-react";
import { sileo } from "sileo";
import { useAuth } from "@/app/AuthContext";
import { URL } from "@/config/config";

type TipoDocumento = {
  _id: string;
  value: string;
};

type BulkUploadResult = {
  totalTrabajadores: number;
  documentosCreados: number;
  fallidos: Array<{
    trabajadorId: string;
    rut: string;
    nombre: string;
    motivo: string;
  }>;
};

type BulkPersonalDocumentUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFinished?: () => void | Promise<void>;
};

const HIDDEN_DOCUMENT_TYPE_IDS = new Set([
  "679fcfe4d964658484179acf",
  "678840cf7e67e1e8c95c27bd",
  "67337993a35183c85300b0bb",
  "678840c57e67e1e8c95c27b9",
]);

const ACCEPTED_PERSONAL_DOCUMENTS = ".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, " ");

export default function BulkPersonalDocumentUploadModal({
  isOpen,
  onClose,
  onFinished,
}: BulkPersonalDocumentUploadModalProps) {
  const { token, authenticatedFetch, hasPermission } = useAuth();
  const canManageWorkerDocuments = hasPermission("trabajadores.documentos.gestionar");
  const [documentTypes, setDocumentTypes] = useState<TipoDocumento[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const loadDocumentTypes = useCallback(async () => {
    if (!token) return;
    setLoadingTypes(true);
    try {
      const response = await authenticatedFetch(`${URL}/tipoDocumento/obtenerTipos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar las categorías.");
      }

      const payload = await response.json();
      const nextDocumentTypes = Array.isArray(payload)
        ? payload
            .filter((item: TipoDocumento) => !HIDDEN_DOCUMENT_TYPE_IDS.has(item._id))
            .sort((a: TipoDocumento, b: TipoDocumento) =>
              a.value.localeCompare(b.value, "es", { sensitivity: "base" })
            )
        : [];
      setDocumentTypes(nextDocumentTypes);
    } catch (error) {
      sileo.error({
        title: "No se pudieron cargar las categorías",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoadingTypes(false);
    }
  }, [authenticatedFetch, token]);

  useEffect(() => {
    if (isOpen) {
      void loadDocumentTypes();
    } else {
      setFile(null);
      setDocumentTypeId("");
      setConfirmed(false);
      setResult(null);
      setShowCategoryCreator(false);
      setNewCategoryName("");
    }
  }, [isOpen, loadDocumentTypes]);

  const handleCreateCategory = async () => {
    if (!token) return;
    const value = normalizeCategoryName(newCategoryName);
    if (value.length < 2) return;

    setCreatingCategory(true);
    try {
      const response = await authenticatedFetch(`${URL}/tipoDocumento/crearTipo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, value }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409 && payload?.tipo?._id) {
          await loadDocumentTypes();
          setDocumentTypeId(payload.tipo._id);
          setShowCategoryCreator(false);
          setNewCategoryName("");
          sileo.info({ title: "Categoría existente seleccionada" });
          return;
        }
        throw new Error(payload?.message || "El servidor no pudo crear la categoría.");
      }

      await loadDocumentTypes();
      if (payload?.tipo?._id) setDocumentTypeId(payload.tipo._id);
      setShowCategoryCreator(false);
      setNewCategoryName("");
      sileo.success({ title: "Categoría creada" });
    } catch (error) {
      sileo.error({
        title: "No se pudo crear la categoría",
        description: error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleUpload = async () => {
    if (!token || !file || !documentTypeId || !confirmed || !canManageWorkerDocuments) return;
    if (file.size > MAX_FILE_SIZE) {
      sileo.error({ title: "El archivo supera 10 MB" });
      return;
    }

    setSaving(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tipo", documentTypeId);
      form.append("token", token);

      const response = await authenticatedFetch(`${URL}/documento/crearDocumentoMasivo`, {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "El servidor no pudo completar la carga.");
      }

      setResult(payload);
      setFile(null);
      setConfirmed(false);
      await onFinished?.();

      if (payload?.fallidos?.length) {
        sileo.warning({
          title: "Carga parcialmente completada",
          description: `${payload.documentosCreados}/${payload.totalTrabajadores} documentos fueron asignados.`,
        });
      } else {
        sileo.success({
          title: "Documento asignado",
          description: `${payload.documentosCreados} trabajadores fueron actualizados.`,
        });
      }
    } catch (error) {
      sileo.error({
        title: "No se pudo subir el documento",
        description: error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
    setResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{ base: "max-h-[calc(100dvh-2rem)]", body: "min-h-0 overflow-y-auto" }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <UsersRound size={20} />
          Subir documento personal a todos
        </ModalHeader>
        <ModalBody className="gap-4">
          <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_auto]">
            <Input
              type="file"
              label="Archivo"
              accept={ACCEPTED_PERSONAL_DOCUMENTS}
              startContent={file ? <FileCheck size={18} /> : <FileUp size={18} />}
              onChange={handleFileChange}
            />
            <Select
              label="Categoría"
              selectedKeys={documentTypeId ? [documentTypeId] : []}
              onChange={(event) => setDocumentTypeId(event.target.value)}
              isDisabled={loadingTypes}
            >
              {documentTypes.map((type) => (
                <SelectItem key={type._id}>{type.value}</SelectItem>
              ))}
            </Select>
            <Button
              isIconOnly
              className="self-end"
              color="primary"
              variant="flat"
              aria-label="Crear categoría"
              title="Crear categoría"
              isDisabled={!canManageWorkerDocuments}
              onPress={() => setShowCategoryCreator((value) => !value)}
            >
              <Plus size={20} />
            </Button>
          </div>

          {showCategoryCreator && (
            <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_auto]">
              <Input
                label="Nueva categoría"
                value={newCategoryName}
                onValueChange={setNewCategoryName}
                maxLength={80}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && normalizeCategoryName(newCategoryName).length >= 2) {
                    event.preventDefault();
                    void handleCreateCategory();
                  }
                }}
              />
              <Button
                className="self-end"
                color="primary"
                isLoading={creatingCategory}
                isDisabled={normalizeCategoryName(newCategoryName).length < 2}
                onPress={() => void handleCreateCategory()}
              >
                Crear
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Asignación masiva</p>
            <p className="mt-1">
              El archivo quedará como documento personal en todos los trabajadores existentes.
            </p>
          </div>

          <Checkbox isSelected={confirmed} onValueChange={setConfirmed}>
            Confirmo la carga masiva para todos los trabajadores actuales.
          </Checkbox>

          {loadingTypes && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Cargando categorías
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Chip color="primary" variant="flat">
                  Trabajadores: {result.totalTrabajadores}
                </Chip>
                <Chip color="success" variant="flat">
                  Asignados: {result.documentosCreados}
                </Chip>
                <Chip color={result.fallidos.length ? "warning" : "default"} variant="flat">
                  Fallidos: {result.fallidos.length}
                </Chip>
              </div>
              {result.fallidos.length > 0 && (
                <div className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600">
                  {result.fallidos.slice(0, 8).map((item) => (
                    <p key={`${item.trabajadorId}-${item.rut}`}>
                      {item.nombre || item.rut || item.trabajadorId}: {item.motivo}
                    </p>
                  ))}
                  {result.fallidos.length > 8 && <p>Hay más errores en el resumen del servidor.</p>}
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cerrar
          </Button>
          <Button
            color="primary"
            startContent={<Send size={18} />}
            isLoading={saving}
            isDisabled={!file || !documentTypeId || !confirmed || !canManageWorkerDocuments}
            onPress={() => void handleUpload()}
          >
            Subir a todos
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
