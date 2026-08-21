"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Chip,
  Input,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import {
  Archive,
  Bold,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  Files,
  FolderPlus,
  Globe2,
  Heading2,
  History,
  List,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Table2,
  Trash2,
  Upload,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { sileo } from "sileo";
import { useAuth } from "@/app/AuthContext";
import BulkPersonalDocumentUploadModal from "@/components/Documents/BulkPersonalDocumentUploadModal";
import {
  addPhysicalSigner,
  approveCompanyDocument,
  archiveCompanyDocument,
  archiveCompanyDocumentCategory,
  archiveCompanyDocumentTemplate,
  createCompanyDocument,
  createCompanyDocumentCategory,
  createCompanyDocumentTemplate,
  diffuseCompanyDocument,
  getCompanyDocument,
  getCompanyDocumentCandidates,
  getCompanyDocumentCategories,
  getCompanyDocumentChangeControl,
  getCompanyDocumentSummary,
  getCompanyDocumentTemplates,
  getCompanyDocuments,
  importCompanyDocumentTemplateDocx,
  previewCompanyDocumentTemplate,
  removePhysicalSigner,
  renewCompanyDocument,
  sendCompanyDocumentTemplate,
  updateCompanyDocument,
  updateCompanyDocumentCategory,
  updateCompanyDocumentVisibility,
  updateCompanyDocumentTemplate,
  updatePhysicalSigner,
} from "@/api/adm/companyDocuments";
import type {
  CompanyDocument,
  CompanyDocumentApproval,
  CompanyDocumentCategory,
  CompanyDocumentChangeControlItem,
  CompanyDocumentMatrixRelation,
  CompanyDocumentSummary,
  CompanyDocumentTemplate,
  DigitalSigner,
  SignatureCandidates,
} from "@/lib/companyDocuments";
import {
  COMPANY_DOCUMENT_STATUS_LABELS,
  COMPANY_DOCUMENT_WORKFLOW_LABELS,
} from "@/lib/companyDocuments";
import { downloadAuthenticatedFile, useAuthenticatedObjectUrl } from "@/lib/authenticatedFiles";

type PhysicalDraft = {
  tipo: "trabajador" | "externo";
  trabajadorId?: string;
  nombre: string;
  rut: string;
  cargo: string;
  estado: "pendiente" | "firmado";
};

type ApprovalType = CompanyDocumentApproval["tipo"];
type EvidenceFormat = "pdf" | "csv";

const EMPTY_SUMMARY: CompanyDocumentSummary = {
  total: 0,
  vigentes: 0,
  porVencer: 0,
  vencidos: 0,
  firmasPendientes: 0,
  pendientesAprobacion: 0,
  firmasDigitalesPendientes: 0,
};

const RESPONSIBLE_DEFAULT = {
  nombre: "Paola Olivares",
  cargo: "Prevencion de Riesgos",
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-CL") : "Sin vencimiento";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("es-CL") : "Sin registro";

const toInputDate = (value?: string | null) => value ? value.slice(0, 10) : "";

const formatBytes = (value: number) => {
  if (value < 1024 * 1024) return `${Math.max(value / 1024, 0.1).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const statusColor = (status: CompanyDocument["estadoVencimiento"]) => {
  if (status === "vigente") return "success" as const;
  if (status === "por_vencer") return "warning" as const;
  if (status === "vencido") return "danger" as const;
  return "default" as const;
};

const workflowColor = (status: CompanyDocument["estado"]) => {
  if (status === "vigente") return "success" as const;
  if (status === "pendiente_aprobacion" || status === "borrador") return "warning" as const;
  if (status === "archivado") return "danger" as const;
  return "default" as const;
};

const visibilityColor = (isGlobal: boolean) => isGlobal ? "primary" as const : "default" as const;

const canEditVisibility = (document: CompanyDocument) =>
  ["vigente", "pendiente_aprobacion", "borrador"].includes(document.estado);

const visibilityConfirmation = (nextIsGlobal: boolean) => nextIsGlobal
  ? "El documento quedará visible para los trabajadores en la APP si está vigente. No se enviará notificación automática. ¿Confirmas cambiarlo a Global?"
  : "El documento dejará de estar visible para los trabajadores en la APP. Las evidencias existentes se conservarán como respaldo histórico. ¿Confirmas cambiarlo a Interno?";

const approvalColor = (status: CompanyDocumentApproval["estado"]) => {
  if (status === "aprobado") return "success" as const;
  if (status === "rechazado") return "danger" as const;
  return "warning" as const;
};

const signatureColor = (status: DigitalSigner["estado"]) => {
  if (status === "aceptado" || status === "firmado") return "success" as const;
  if (status === "vencido" || status === "bloqueado") return "danger" as const;
  return "warning" as const;
};

const approvalLabel = (type: ApprovalType) => type === "gerencia" ? "Gerencia" : "Prevencion";

const matrixInputFromDocument = (items: CompanyDocumentMatrixRelation[]) =>
  items.map((item) => [item.codigo, item.nombre, item.descripcion].filter(Boolean).join(" | ")).join("\n");

const parseMatrixInput = (value: string) =>
  value
    .split("\n")
    .map((line) => {
      const [codigo = "", nombre = "", descripcion = ""] = line.split("|").map((part) => part.trim());
      return { codigo, nombre, descripcion };
    })
    .filter((item) => item.codigo);

const downloadLocalCsv = (fileName: string, rows: string[][]) => {
  const escapeCsv = (value: string) => /[",\n\r;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(";")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  globalThis.URL.revokeObjectURL(url);
};

function DocumentVisibilityControl({
  document,
  canManage,
  isLoading,
  onChange,
}: {
  document: CompanyDocument;
  canManage: boolean;
  isLoading: boolean;
  onChange: (nextIsGlobal: boolean) => Promise<void> | void;
}) {
  const label = document.esGlobal ? "Global" : "Interno";
  if (!canManage || !canEditVisibility(document)) {
    return (
      <Chip size="sm" color={visibilityColor(document.esGlobal)} variant="flat">
        {label}
      </Chip>
    );
  }

  return (
    <Button
      size="sm"
      color={visibilityColor(document.esGlobal)}
      variant="flat"
      isLoading={isLoading}
      startContent={!isLoading ? (document.esGlobal ? <Globe2 size={14} /> : <LockKeyhole size={14} />) : undefined}
      onPress={() => void onChange(!document.esGlobal)}
    >
      {label}
    </Button>
  );
}

function DocumentPreview({ document }: { document: CompanyDocument }) {
  const { authenticatedFetch } = useAuth();
  const objectUrl = useAuthenticatedObjectUrl(document.archivo.url, authenticatedFetch);

  if (!objectUrl) return <div className="grid h-64 place-items-center rounded-xl bg-slate-100"><Spinner /></div>;
  if (document.archivo.mimeType.startsWith("image/")) {
    return <Image src={objectUrl} alt={document.titulo} className="max-h-[400px] w-full rounded-xl bg-slate-100 object-contain" />;
  }
  if (document.archivo.mimeType === "application/pdf") {
    return <iframe title={`Vista previa de ${document.titulo}`} src={objectUrl} className="h-[400px] w-full rounded-xl border border-slate-200" />;
  }
  return (
    <div className="grid h-56 place-items-center rounded-xl bg-slate-100 text-center text-slate-500">
      <div>
        <Files className="mx-auto mb-3" size={42} />
        <p>Este formato se abre mediante descarga.</p>
      </div>
    </div>
  );
}

export default function CompanyDocumentsPage() {
  const { authenticatedFetch, hasPermission, socket } = useAuth();
  const canManage = hasPermission("documentos_empresa.gestionar");
  const canManageCategories = hasPermission("documentos_empresa.categorias.gestionar");
  const canManageSignatures = hasPermission("documentos_empresa.firmas.gestionar");
  const canManageWorkerDocuments = hasPermission("trabajadores.documentos.gestionar");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CompanyDocumentCategory[]>([]);
  const [templates, setTemplates] = useState<CompanyDocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [candidates, setCandidates] = useState<SignatureCandidates>({ trabajadores: [], roles: [] });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [bulkPersonalOpen, setBulkPersonalOpen] = useState(false);
  const [changeControlOpen, setChangeControlOpen] = useState(false);
  const [detail, setDetail] = useState<CompanyDocument | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<CompanyDocumentCategory | "new" | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (categoryFilter !== "all") params.set("categoria", categoryFilter);
      if (search.trim()) params.set("q", search.trim());
      const [categoryItems, documentPage, nextSummary, templateItems] = await Promise.all([
        getCompanyDocumentCategories(authenticatedFetch),
        getCompanyDocuments(authenticatedFetch, params),
        getCompanyDocumentSummary(authenticatedFetch),
        canManage ? getCompanyDocumentTemplates(authenticatedFetch) : Promise.resolve([]),
      ]);
      setCategories(categoryItems);
      setDocuments(documentPage.items);
      setSummary({ ...EMPTY_SUMMARY, ...nextSummary });
      setTemplates(templateItems);
      if (canManageSignatures) {
        setCandidates(await getCompanyDocumentCandidates(authenticatedFetch));
      }
    } catch (error) {
      sileo.error({ title: "No se pudo cargar la biblioteca", description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, canManage, canManageSignatures, categoryFilter, search]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!socket) return;
    const refresh = () => void loadData();
    socket.on("documentosEmpresaActualizados", refresh);
    return () => { socket.off("documentosEmpresaActualizados", refresh); };
  }, [loadData, socket]);

  const filteredDocuments = useMemo(() => documents.filter((document) => {
    const matchesStatus = statusFilter === "all" ||
      document.estadoVencimiento === statusFilter ||
      document.estado === statusFilter;
    const matchesVisibility = visibilityFilter === "all" ||
      (visibilityFilter === "global" && document.esGlobal) ||
      (visibilityFilter === "interno" && !document.esGlobal);
    return matchesStatus && matchesVisibility;
  }), [documents, statusFilter, visibilityFilter]);

  const openDetail = async (id: string) => {
    try {
      setDetail(await getCompanyDocument(authenticatedFetch, id));
    } catch (error) {
      sileo.error({ title: "No se pudo abrir el documento", description: error instanceof Error ? error.message : undefined });
    }
  };

  const refreshDetail = async (id: string) => {
    setDetail(await getCompanyDocument(authenticatedFetch, id));
    await loadData();
  };

  const changeDocumentVisibility = useCallback(async (document: CompanyDocument, nextIsGlobal: boolean) => {
    if (document.esGlobal === nextIsGlobal) return;
    if (!globalThis.confirm(visibilityConfirmation(nextIsGlobal))) return;

    setVisibilitySavingId(document.id);
    try {
      const updated = await updateCompanyDocumentVisibility(authenticatedFetch, document.id, nextIsGlobal);
      setDocuments((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (detail?.id === updated.id) {
        setDetail(await getCompanyDocument(authenticatedFetch, updated.id));
      }
      await loadData();
      sileo.success({
        title: `Documento ${updated.esGlobal ? "global" : "interno"}`,
        description: updated.esGlobal
          ? "Quedará visible para trabajadores cuando esté vigente."
          : "Dejará de aparecer para trabajadores y mantendrá sus evidencias.",
      });
    } catch (error) {
      sileo.error({ title: "No se pudo cambiar la visibilidad", description: error instanceof Error ? error.message : undefined });
    } finally {
      setVisibilitySavingId(null);
    }
  }, [authenticatedFetch, detail?.id, loadData]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Documentos empresariales</h1>
            <p className="text-sm text-slate-500">Biblioteca interna y documentos globales para trabajadores.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="flat" startContent={<ClipboardCheck size={18} />} onPress={() => setChangeControlOpen(true)}>
              Matriz de cambios
            </Button>
            {canManageWorkerDocuments && (
              <Button color="secondary" variant="flat" startContent={<UsersRound size={18} />} onPress={() => setBulkPersonalOpen(true)}>
                Personal a todos
              </Button>
            )}
            {canManage && (
              <Button variant="flat" startContent={<FilePlus2 size={18} />} onPress={() => setTemplatesOpen(true)}>
                Plantillas
              </Button>
            )}
            {canManage && (
              <Button color="primary" startContent={<Upload size={18} />} onPress={() => setUploadOpen(true)}>
                Subir documento
              </Button>
            )}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Documentos", summary.total, "all"],
            ["Vigentes", summary.vigentes, "vigente"],
            ["Por vencer", summary.porVencer, "por_vencer"],
            ["Vencidos", summary.vencidos, "vencido"],
            ["Aprobaciones", summary.pendientesAprobacion || 0, "pendiente_aprobacion"],
            ["Firmas APP", summary.firmasDigitalesPendientes || 0, "all"],
          ].map(([label, value, filter]) => (
            <button
              key={String(label)}
              onClick={() => setStatusFilter(String(filter))}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary-300"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
            </button>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Categorías</h2>
              {canManageCategories && (
                <Button isIconOnly size="sm" variant="flat" onPress={() => setCategoryEditor("new")} aria-label="Nueva categoría">
                  <FolderPlus size={17} />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${categoryFilter === "all" ? "bg-primary-50 font-semibold text-primary" : "hover:bg-slate-50"}`}
              >
                <span>Todas</span>
                <span>{summary.total}</span>
              </button>
              {categories.map((category) => (
                <div key={category.id} className={`group flex items-center rounded-xl ${!category.activo ? "opacity-50" : ""}`}>
                  <button
                    onClick={() => setCategoryFilter(category.id)}
                    className={`flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${categoryFilter === category.id ? "bg-primary-50 font-semibold text-primary" : "hover:bg-slate-50"}`}
                  >
                    <span className="truncate">{category.nombre}</span>
                    <span>{category.documentos || 0}</span>
                  </button>
                  {canManageCategories && category.activo && (
                    <Button isIconOnly size="sm" variant="light" className="opacity-0 group-hover:opacity-100" onPress={() => setCategoryEditor(category)} aria-label="Editar categoría">
                      <Pencil size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <main className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-3">
              <Input className="min-w-56 flex-1" placeholder="Buscar por título, código o descripción" startContent={<Search size={17} />} value={search} onValueChange={setSearch} />
              <Select className="w-56" label="Estado" selectedKeys={[statusFilter]} onChange={(event) => setStatusFilter(event.target.value)}>
                <SelectItem key="all">Todos</SelectItem>
                <SelectItem key="vigente">Vigentes</SelectItem>
                <SelectItem key="por_vencer">Por vencer</SelectItem>
                <SelectItem key="vencido">Vencidos</SelectItem>
                <SelectItem key="pendiente_aprobacion">Pendiente aprobación</SelectItem>
                <SelectItem key="reemplazado">Reemplazados</SelectItem>
              </Select>
              <Select className="w-48" label="Visibilidad" selectedKeys={[visibilityFilter]} onChange={(event) => setVisibilityFilter(event.target.value)}>
                <SelectItem key="all">Todos</SelectItem>
                <SelectItem key="global">Globales</SelectItem>
                <SelectItem key="interno">Internos</SelectItem>
              </Select>
            </div>
            {loading ? (
              <div className="grid min-h-72 place-items-center"><Spinner /></div>
            ) : filteredDocuments.length === 0 ? (
              <div className="grid min-h-72 place-items-center text-center text-slate-500">
                <div>
                  <Files className="mx-auto mb-3" size={44} />
                  <p>No hay documentos para estos filtros.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="px-3 py-3">Documento</th>
                      <th className="px-3 py-3">Categoría</th>
                      <th className="px-3 py-3">Flujo</th>
                      <th className="px-3 py-3">Visibilidad</th>
                      <th className="px-3 py-3">Vencimiento</th>
                      <th className="px-3 py-3">Firma APP</th>
                      <th className="px-3 py-3">Físicas</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((document) => (
                      <tr key={document.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{document.titulo}</p>
                          <p className="text-xs text-slate-500">{document.codigoVersionado || `v${document.version}`} · {document.archivo.nombre}</p>
                        </td>
                        <td className="px-3 py-3">{document.categoria.nombre}</td>
                        <td className="px-3 py-3">
                          <Chip size="sm" color={workflowColor(document.estado)} variant="flat">
                            {COMPANY_DOCUMENT_WORKFLOW_LABELS[document.estado]}
                          </Chip>
                        </td>
                        <td className="px-3 py-3">
                          <DocumentVisibilityControl
                            document={document}
                            canManage={canManage}
                            isLoading={visibilitySavingId === document.id}
                            onChange={(nextIsGlobal) => changeDocumentVisibility(document, nextIsGlobal)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Chip size="sm" color={statusColor(document.estadoVencimiento)} variant="flat">
                            {COMPANY_DOCUMENT_STATUS_LABELS[document.estadoVencimiento]}
                          </Chip>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(document.fechaVencimiento)}</p>
                        </td>
                        <td className="px-3 py-3">
                          {document.requiereFirmaDigital || document.firmasDigitales.total > 0
                            ? `${document.firmasDigitales.aceptados + document.firmasDigitales.firmados}/${document.firmasDigitales.total}`
                            : "-"}
                        </td>
                        <td className="px-3 py-3">{document.esGlobal ? "-" : `${document.firmas.completadas}/${document.firmas.total}`}</td>
                        <td className="px-3 py-3 text-right">
                          <Button size="sm" variant="light" startContent={<Eye size={16} />} onPress={() => void openDetail(document.id)}>
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

      <UploadDocumentModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={categories.filter((category) => category.activo)}
        candidates={candidates}
        canManageSignatures={canManageSignatures}
        authenticatedFetch={authenticatedFetch}
        onCreated={async (document) => {
          setUploadOpen(false);
          await loadData();
          await openDetail(document.id);
        }}
      />
      <BulkPersonalDocumentUploadModal isOpen={bulkPersonalOpen} onClose={() => setBulkPersonalOpen(false)} />
      <TemplatesModal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={templates}
        categories={categories.filter((category) => category.activo)}
        authenticatedFetch={authenticatedFetch}
        onSaved={loadData}
        onSent={async (document) => {
          setTemplatesOpen(false);
          await loadData();
          await openDetail(document.id);
        }}
      />
      <CategoryModal editor={categoryEditor} onClose={() => setCategoryEditor(null)} authenticatedFetch={authenticatedFetch} onSaved={loadData} />
      <ChangeControlModal isOpen={changeControlOpen} onClose={() => setChangeControlOpen(false)} authenticatedFetch={authenticatedFetch} />
      <DocumentDetailModal
        document={detail}
        onClose={() => setDetail(null)}
        authenticatedFetch={authenticatedFetch}
        canManage={canManage}
        canManageSignatures={canManageSignatures}
        candidates={candidates}
        visibilitySavingId={visibilitySavingId}
        onVisibilityChange={changeDocumentVisibility}
        onRefresh={refreshDetail}
      />
    </div>
  );
}

function CategoryModal({
  editor,
  onClose,
  authenticatedFetch,
  onSaved,
}: {
  editor: CompanyDocumentCategory | "new" | null;
  onClose: () => void;
  authenticatedFetch: typeof fetch;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(editor && editor !== "new" ? editor.nombre : "");
    setDescription(editor && editor !== "new" ? editor.descripcion : "");
  }, [editor]);

  const save = async () => {
    setSaving(true);
    try {
      if (editor === "new") await createCompanyDocumentCategory(authenticatedFetch, { nombre: name, descripcion: description });
      else if (editor) await updateCompanyDocumentCategory(authenticatedFetch, editor.id, { nombre: name, descripcion: description });
      await onSaved();
      onClose();
      sileo.success({ title: "Categoría guardada" });
    } catch (error) {
      sileo.error({ title: "No se pudo guardar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!editor || editor === "new" || !confirm("La categoría dejará de aceptar nuevos documentos. Los archivos se conservarán.")) return;
    setSaving(true);
    try {
      await archiveCompanyDocumentCategory(authenticatedFetch, editor.id);
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={Boolean(editor)} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{editor === "new" ? "Nueva categoría" : "Editar categoría"}</ModalHeader>
        <ModalBody>
          <Input label="Nombre" value={name} onValueChange={setName} />
          <Textarea label="Descripción" value={description} onValueChange={setDescription} />
        </ModalBody>
        <ModalFooter>
          {editor !== "new" && (
            <Button color="danger" variant="light" onPress={() => void archive()} startContent={<Archive size={16} />}>
              Archivar
            </Button>
          )}
          <Button variant="light" onPress={onClose}>Cancelar</Button>
          <Button color="primary" isLoading={saving} isDisabled={name.trim().length < 2} onPress={() => void save()}>Guardar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function TemplatesModal({
  isOpen,
  onClose,
  templates,
  categories,
  authenticatedFetch,
  onSaved,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  templates: CompanyDocumentTemplate[];
  categories: CompanyDocumentCategory[];
  authenticatedFetch: typeof fetch;
  onSaved: () => Promise<void>;
  onSent: (document: CompanyDocument) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string>("new");
  const selectedTemplate = templates.find((template) => template.id === activeId) || null;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [acceptance, setAcceptance] = useState("");
  const [codeBase, setCodeBase] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [baseFile, setBaseFile] = useState<CompanyDocumentTemplate["archivoBase"]>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [sendTitle, setSendTitle] = useState("");
  const [sendIssueDate, setSendIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [sendExpiration, setSendExpiration] = useState("");
  const [sendWarningDays, setSendWarningDays] = useState("30");
  const [sendScope, setSendScope] = useState("Todos los trabajadores");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (templates.length > 0 && activeId !== "new" && !templates.some((template) => template.id === activeId)) {
      setActiveId(templates[0].id);
    }
  }, [activeId, isOpen, templates]);

  const plainTextToHtml = useCallback((value: string) => value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`)
    .join(""), []);

  const loadEditorHtml = useCallback((html: string, plainText?: string) => {
    const nextHtml = html || plainTextToHtml(plainText || "");
    setContentHtml(nextHtml);
    setContent(plainText || "");
    if (editorRef.current) editorRef.current.innerHTML = nextHtml;
  }, [plainTextToHtml]);

  useEffect(() => {
    if (selectedTemplate) {
      setName(selectedTemplate.nombre);
      setDescription(selectedTemplate.descripcion);
      setContent(selectedTemplate.contenido);
      setContentHtml(selectedTemplate.contenidoHtml || plainTextToHtml(selectedTemplate.contenido));
      setAcceptance(selectedTemplate.textoAceptacion);
      setCodeBase(selectedTemplate.codigoBase);
      setCategoryId(selectedTemplate.categoriaId || "");
      setBaseFile(selectedTemplate.archivoBase || null);
      setSendTitle(selectedTemplate.nombre);
      setSendScope("Todos los trabajadores");
      queueMicrotask(() => loadEditorHtml(selectedTemplate.contenidoHtml || plainTextToHtml(selectedTemplate.contenido), selectedTemplate.contenido));
      return;
    }
    const defaultContent = "Yo, {{trabajador.nombre}}, RUT {{trabajador.rut}}, declaro recibir y conocer el documento {{documento.titulo}} version {{documento.version}}.";
    setName("");
    setDescription("");
    setContent(defaultContent);
    setContentHtml(plainTextToHtml(defaultContent));
    setAcceptance("Declaro haber recibido, leido, comprendido y aceptado el contenido de este documento.");
    setCodeBase("");
    setCategoryId("");
    setBaseFile(null);
    setSendTitle("");
    setSendScope("Todos los trabajadores");
    queueMicrotask(() => loadEditorHtml(plainTextToHtml(defaultContent), defaultContent));
  }, [loadEditorHtml, plainTextToHtml, selectedTemplate]);

  const syncEditor = () => {
    const html = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.innerText || "";
    setContentHtml(html);
    setContent(text.trim());
  };

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    globalThis.document.execCommand(command, false, value);
    syncEditor();
  };

  const insertVariable = (variable: string) => {
    editorRef.current?.focus();
    globalThis.document.execCommand("insertText", false, variable);
    syncEditor();
  };

  const insertTable = () => {
    editorRef.current?.focus();
    globalThis.document.execCommand(
      "insertHTML",
      false,
      '<table><tbody><tr><th>Campo</th><th>Detalle</th></tr><tr><td>{{trabajador.nombre}}</td><td>{{documento.titulo}}</td></tr></tbody></table><p><br></p>'
    );
    syncEditor();
  };

  const detectedVariables = useMemo(() => Array.from(new Set(
    `${contentHtml}\n${content}\n${acceptance}`
      .match(/\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/g)
      ?.map((match) => match.replace(/[{}]/g, "").trim())
      .filter(Boolean) || []
  )).sort((left, right) => left.localeCompare(right, "es")), [acceptance, content, contentHtml]);

  useEffect(() => {
    if (!isOpen || content.length < 10) {
      setPreviewHtml("");
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setPreviewing(true);
      previewCompanyDocumentTemplate(authenticatedFetch, {
        nombre: name || "Vista previa",
        contenido: content,
        contenidoHtml: contentHtml,
        textoAceptacion: acceptance,
        codigoBase: codeBase,
        titulo: sendTitle || name,
        categoriaNombre: categories.find((category) => category.id === categoryId)?.nombre || "",
        fechaEmision: sendIssueDate,
        fechaVencimiento: sendExpiration,
        responsableNombre: RESPONSIBLE_DEFAULT.nombre,
        responsableCargo: RESPONSIBLE_DEFAULT.cargo,
      })
        .then((result) => {
          if (!cancelled) setPreviewHtml(result.html);
        })
        .catch(() => {
          if (!cancelled) setPreviewHtml("");
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [acceptance, authenticatedFetch, categories, categoryId, codeBase, content, contentHtml, isOpen, name, sendExpiration, sendIssueDate, sendTitle]);

  const importDocx = async (file?: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const imported = await importCompanyDocumentTemplateDocx(authenticatedFetch, form);
      if (!name.trim()) setName(imported.nombre);
      setBaseFile(imported.archivoBase);
      loadEditorHtml(imported.contenidoHtml, imported.contenido);
      sileo.success({ title: "Plantilla importada" });
    } catch (error) {
      sileo.error({ title: "No se pudo importar DOCX", description: error instanceof Error ? error.message : undefined });
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    if (name.trim().length < 2 || content.trim().length < 10) return;
    setSaving(true);
    try {
      const body = {
        nombre: name,
        descripcion: description,
        contenido: content,
        contenidoHtml: contentHtml,
        textoAceptacion: acceptance,
        codigoBase: codeBase,
        categoriaId: categoryId,
        archivoBase: baseFile,
      };
      const saved = selectedTemplate
        ? await updateCompanyDocumentTemplate(authenticatedFetch, selectedTemplate.id, body)
        : await createCompanyDocumentTemplate(authenticatedFetch, body);
      setActiveId(saved.id);
      await onSaved();
      sileo.success({ title: "Plantilla guardada" });
    } catch (error) {
      sileo.error({ title: "No se pudo guardar la plantilla", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!selectedTemplate || !confirm("La plantilla se archivará, pero los documentos ya enviados se conservarán.")) return;
    setSaving(true);
    try {
      await archiveCompanyDocumentTemplate(authenticatedFetch, selectedTemplate.id);
      setActiveId("new");
      await onSaved();
      sileo.success({ title: "Plantilla archivada" });
    } catch (error) {
      sileo.error({ title: "No se pudo archivar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!selectedTemplate || !categoryId) return;
    setSending(true);
    try {
      const result = await sendCompanyDocumentTemplate(authenticatedFetch, selectedTemplate.id, {
        titulo: sendTitle || selectedTemplate.nombre,
        descripcion: description,
        categoriaId: categoryId,
        codigoBase: codeBase,
        fechaEmision: sendIssueDate,
        fechaVencimiento: sendExpiration,
        diasAviso: Number(sendWarningDays) || 30,
        responsableNombre: RESPONSIBLE_DEFAULT.nombre,
        responsableCargo: RESPONSIBLE_DEFAULT.cargo,
        alcanceDescripcion: sendScope,
      });
      sileo.success({ title: "Plantilla enviada", description: result.message });
      await onSent(result.document);
    } catch (error) {
      sileo.error({ title: "No se pudo enviar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSending(false);
    }
  };

  const variables = [
    "{{trabajador.nombre}}",
    "{{trabajador.rut}}",
    "{{trabajador.cargo}}",
    "{{documento.titulo}}",
    "{{documento.codigo}}",
    "{{documento.version}}",
    "{{firma.codigo}}",
    "{{firma.fecha}}",
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside" classNames={{ base: "w-[94vw] !max-w-[1400px] max-h-[94vh]" }}>
      <ModalContent>
        <ModalHeader>Plantillas documentales</ModalHeader>
        <ModalBody className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-2">
            <Button fullWidth color={activeId === "new" ? "primary" : "default"} variant={activeId === "new" ? "solid" : "flat"} onPress={() => setActiveId("new")}>
              Nueva plantilla
            </Button>
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setActiveId(template.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm ${activeId === template.id ? "border-primary bg-primary-50 text-primary" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <p className="font-semibold">{template.nombre}</p>
                  <p className="text-xs text-slate-500">v{template.version} {template.categoria?.nombre ? `· ${template.categoria.nombre}` : ""}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Contenido</h3>
                <Input
                  className="max-w-xs"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  label="Subir plantilla DOCX"
                  isDisabled={importing}
                  startContent={<FileUp size={16} />}
                  onChange={(event) => void importDocx(event.target.files?.[0])}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Nombre" value={name} onValueChange={setName} />
                <Input label="Código base" value={codeBase} onValueChange={setCodeBase} placeholder="Opcional" />
                <Select label="Categoría sugerida" selectedKeys={categoryId ? [categoryId] : []} onChange={(event) => setCategoryId(event.target.value)}>
                  {categories.map((category) => <SelectItem key={category.id}>{category.nombre}</SelectItem>)}
                </Select>
                <Input label="Descripción" value={description} onValueChange={setDescription} />
              </div>

              <div className="mt-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
                  <Button size="sm" isIconOnly variant="light" aria-label="Texto normal" onPress={() => runEditorCommand("formatBlock", "p")}>
                    <span className="text-sm font-bold">P</span>
                  </Button>
                  <Button size="sm" isIconOnly variant="light" aria-label="Título" onPress={() => runEditorCommand("formatBlock", "h2")}>
                    <Heading2 size={16} />
                  </Button>
                  <Button size="sm" isIconOnly variant="light" aria-label="Negrita" onPress={() => runEditorCommand("bold")}>
                    <Bold size={16} />
                  </Button>
                  <Button size="sm" isIconOnly variant="light" aria-label="Lista" onPress={() => runEditorCommand("insertUnorderedList")}>
                    <List size={16} />
                  </Button>
                  <Button size="sm" isIconOnly variant="light" aria-label="Tabla" onPress={insertTable}>
                    <Table2 size={16} />
                  </Button>
                  <Select
                    size="sm"
                    className="min-w-48 max-w-64"
                    label="Variable"
                    selectedKeys={[]}
                    onChange={(event) => insertVariable(event.target.value)}
                  >
                    {variables.map((variable) => <SelectItem key={variable}>{variable}</SelectItem>)}
                  </Select>
                </div>
                <div
                  ref={editorRef}
                  className="min-h-[280px] overflow-auto bg-white p-4 text-sm leading-6 outline-none [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-5 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncEditor}
                  onBlur={syncEditor}
                />
              </div>

              <Textarea className="mt-3" minRows={3} label="Texto de aceptación" value={acceptance} onValueChange={setAcceptance} />
              <div className="mt-3 flex flex-wrap gap-2">
                {variables.map((variable) => <Chip key={variable} size="sm" variant="flat">{variable}</Chip>)}
              </div>
              {detectedVariables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {detectedVariables.map((variable) => <Chip key={variable} size="sm" color="success" variant="flat">{variable}</Chip>)}
                </div>
              )}
              {baseFile?.nombreOriginal && (
                <p className="mt-3 text-xs text-slate-500">Base: {baseFile.nombreOriginal}</p>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {selectedTemplate && (
                  <Button color="danger" variant="light" isLoading={saving} onPress={() => void archive()}>
                    Archivar
                  </Button>
                )}
                <Button color="primary" isLoading={saving} isDisabled={name.trim().length < 2 || content.trim().length < 10} onPress={() => void save()}>
                  Guardar plantilla
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-bold">Vista previa</h3>
                {previewing && <Spinner size="sm" />}
              </div>
              {previewHtml ? (
                <iframe title="Vista previa de plantilla" srcDoc={previewHtml} sandbox="" className="h-[560px] w-full rounded-xl border border-slate-200 bg-white" />
              ) : (
                <div className="grid h-64 place-items-center rounded-xl bg-slate-100 text-sm text-slate-500">
                  Vista previa no disponible
                </div>
              )}
            </section>

            {selectedTemplate && (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 font-bold"><Send size={17} /> Enviar con firma por código</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Título del documento" value={sendTitle} onValueChange={setSendTitle} />
                  <Select label="Categoría documental" selectedKeys={categoryId ? [categoryId] : []} onChange={(event) => setCategoryId(event.target.value)}>
                    {categories.map((category) => <SelectItem key={category.id}>{category.nombre}</SelectItem>)}
                  </Select>
                  <Input type="date" label="Fecha de emisión" value={sendIssueDate} onValueChange={setSendIssueDate} />
                  <Input type="date" label="Fecha de vencimiento" value={sendExpiration} onValueChange={setSendExpiration} />
                  <Input type="number" min={1} max={365} label="Avisar con anticipación" value={sendWarningDays} onValueChange={setSendWarningDays} />
                  <Input label="Alcance" value={sendScope} onValueChange={setSendScope} />
                </div>
                <Button className="mt-3" color="success" isLoading={sending} isDisabled={!categoryId} startContent={<Send size={16} />} onPress={() => void send()}>
                  Enviar a todos los trabajadores
                </Button>
              </section>
            )}
          </div>
        </ModalBody>
        <ModalFooter><Button variant="light" onPress={onClose}>Cerrar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function UploadDocumentModal({
  isOpen,
  onClose,
  categories,
  candidates,
  canManageSignatures,
  authenticatedFetch,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: CompanyDocumentCategory[];
  candidates: SignatureCandidates;
  canManageSignatures: boolean;
  authenticatedFetch: typeof fetch;
  onCreated: (document: CompanyDocument) => Promise<void>;
}) {
  const [isGlobal, setIsGlobal] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [codeBase, setCodeBase] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiration, setExpiration] = useState("");
  const [warningDays, setWarningDays] = useState("30");
  const [responsibleName, setResponsibleName] = useState(RESPONSIBLE_DEFAULT.nombre);
  const [responsibleRole, setResponsibleRole] = useState(RESPONSIBLE_DEFAULT.cargo);
  const [changeDescription, setChangeDescription] = useState("Creacion inicial del documento");
  const [scopeDescription, setScopeDescription] = useState("");
  const [matrixRelations, setMatrixRelations] = useState("");
  const [physical, setPhysical] = useState<PhysicalDraft[]>([]);
  const [physicalWorker, setPhysicalWorker] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalRut, setExternalRut] = useState("");
  const [externalRole, setExternalRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsGlobal(false);
      setRequireApproval(true);
      setRequireDigitalSignature(true);
      setFile(null);
      setTitle("");
      setDescription("");
      setCategoryId("");
      setCodeBase("");
      setIssueDate("");
      setExpiration("");
      setWarningDays("30");
      setResponsibleName(RESPONSIBLE_DEFAULT.nombre);
      setResponsibleRole(RESPONSIBLE_DEFAULT.cargo);
      setChangeDescription("Creacion inicial del documento");
      setScopeDescription("");
      setMatrixRelations("");
      setPhysical([]);
      setPhysicalWorker("");
      setExternalName("");
      setExternalRut("");
      setExternalRole("");
    }
  }, [isOpen]);

  const addWorker = () => {
    const worker = candidates.trabajadores.find(({ id }) => id === physicalWorker);
    if (!worker || physical.some((item) => item.trabajadorId === worker.id)) return;
    setPhysical((current) => [...current, {
      tipo: "trabajador",
      trabajadorId: worker.id,
      nombre: worker.nombre,
      rut: worker.rut,
      cargo: worker.arquetipo,
      estado: "pendiente",
    }]);
    setPhysicalWorker("");
  };

  const addExternal = () => {
    if (!externalName.trim()) return;
    setPhysical((current) => [...current, {
      tipo: "externo",
      nombre: externalName.trim(),
      rut: externalRut.trim(),
      cargo: externalRole.trim(),
      estado: "pendiente",
    }]);
    setExternalName("");
    setExternalRut("");
    setExternalRole("");
  };

  const save = async () => {
    if (!file || !title.trim() || !categoryId) return;
    if (file.size > 25 * 1024 * 1024) {
      sileo.error({ title: "El archivo supera 25 MB" });
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("titulo", title);
      form.append("descripcion", description);
      form.append("esGlobal", String(isGlobal));
      form.append("categoriaId", categoryId);
      form.append("codigoBase", codeBase);
      form.append("fechaEmision", issueDate);
      form.append("fechaVencimiento", expiration);
      form.append("diasAviso", warningDays);
      form.append("requiereAprobacion", String(requireApproval));
      form.append("requiereFirmaDigital", String(requireDigitalSignature));
      form.append("responsableNombre", responsibleName);
      form.append("responsableCargo", responsibleRole);
      form.append("motivoCambio", changeDescription);
      form.append("alcanceDescripcion", scopeDescription);
      form.append("matricesRelacionadas", JSON.stringify(parseMatrixInput(matrixRelations)));
      form.append("firmantesFisicos", JSON.stringify(isGlobal ? [] : physical));
      const created = await createCompanyDocument(authenticatedFetch, form);
      await onCreated(created);
      sileo.success({ title: "Documento guardado" });
    } catch (error) {
      sileo.error({ title: "No se completó la operación", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{ base: "max-h-[calc(100dvh-2rem)]", body: "min-h-0 overflow-y-auto" }}
    >
      <ModalContent>
        <ModalHeader>Subir documento empresarial</ModalHeader>
        <ModalBody className="min-h-0 gap-5 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <Input type="file" label="Archivo" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Select label="Categoría" selectedKeys={categoryId ? [categoryId] : []} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => <SelectItem key={category.id}>{category.nombre}</SelectItem>)}
            </Select>
            <Input label="Título" value={title} onValueChange={setTitle} />
            <Input label="Código base" placeholder="Automático si queda vacío" value={codeBase} onValueChange={setCodeBase} />
            <Input label="Fecha de emisión" type="date" value={issueDate} onValueChange={setIssueDate} />
            <Input label="Fecha de vencimiento" type="date" value={expiration} onValueChange={setExpiration} />
            <Input label="Avisar con anticipación" type="number" min={1} max={365} value={warningDays} onValueChange={setWarningDays} />
            <div className="flex min-h-16 items-center gap-4 rounded-xl border border-slate-200 px-3">
              <Checkbox isSelected={isGlobal} onValueChange={setIsGlobal}>Global</Checkbox>
              <Checkbox isSelected={requireApproval} onValueChange={setRequireApproval}>Aprobación</Checkbox>
              <Checkbox isSelected={requireDigitalSignature} onValueChange={setRequireDigitalSignature}>Firma APP</Checkbox>
            </div>
          </div>

          <Textarea label="Descripción" value={description} onValueChange={setDescription} />

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={17} /> Sistema de gestión</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Responsable SGI" value={responsibleName} onValueChange={setResponsibleName} />
              <Input label="Cargo responsable" value={responsibleRole} onValueChange={setResponsibleRole} />
            </div>
            <Textarea className="mt-3" label="Control de cambio" value={changeDescription} onValueChange={setChangeDescription} />
            <Textarea className="mt-3" label="Matrices relacionadas" placeholder="CODIGO | Nombre | Detalle" value={matrixRelations} onValueChange={setMatrixRelations} />
            <Textarea className="mt-3" label="Alcance de difusión" value={scopeDescription} onValueChange={setScopeDescription} />
          </section>

          {canManageSignatures && !isGlobal && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-3 font-bold">Firmantes físicos esperados</h3>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Autocomplete
                  label="Trabajador"
                  placeholder="Buscar por nombre o RUT"
                  selectedKey={physicalWorker || null}
                  onSelectionChange={(key) => setPhysicalWorker(key ? String(key) : "")}
                  defaultItems={candidates.trabajadores}
                >
                  {(worker) => <AutocompleteItem key={worker.id} textValue={`${worker.nombre} · ${worker.rut}`}>{worker.nombre} · {worker.rut}</AutocompleteItem>}
                </Autocomplete>
                <Button className="self-end" isDisabled={!physicalWorker} onPress={addWorker} startContent={<UserPlus size={16} />}>Agregar</Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_1fr_auto]">
                <Input label="Firmante externo" value={externalName} onValueChange={setExternalName} />
                <Input label="RUT opcional" value={externalRut} onValueChange={setExternalRut} />
                <Input label="Cargo opcional" value={externalRole} onValueChange={setExternalRole} />
                <Button className="self-end" onPress={addExternal}>Agregar</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {physical.map((signer, index) => (
                  <Chip key={`${signer.tipo}-${signer.trabajadorId || signer.nombre}-${index}`} onClose={() => setPhysical((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    {signer.nombre} · {signer.tipo === "trabajador" ? "trabajador" : "externo"}
                  </Chip>
                ))}
              </div>
            </section>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Cancelar</Button>
          <Button color="primary" isLoading={saving} isDisabled={!file || !title.trim() || !categoryId} onPress={() => void save()}>
            Guardar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DocumentMetadataPanel({
  document,
  authenticatedFetch,
  canManage,
  visibilitySaving,
  onVisibilityChange,
  onRefresh,
}: {
  document: CompanyDocument;
  authenticatedFetch: typeof fetch;
  canManage: boolean;
  visibilitySaving: boolean;
  onVisibilityChange: (nextIsGlobal: boolean) => Promise<void> | void;
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(document.titulo);
  const [description, setDescription] = useState(document.descripcion);
  const [issueDate, setIssueDate] = useState(toInputDate(document.fechaEmision));
  const [expiration, setExpiration] = useState(toInputDate(document.fechaVencimiento));
  const [warningDays, setWarningDays] = useState(String(document.diasAviso));
  const [responsibleName, setResponsibleName] = useState(document.responsableSistemaGestion.nombre || RESPONSIBLE_DEFAULT.nombre);
  const [responsibleRole, setResponsibleRole] = useState(document.responsableSistemaGestion.cargo || RESPONSIBLE_DEFAULT.cargo);
  const [requiresDigital, setRequiresDigital] = useState(document.requiereFirmaDigital);
  const [scopeDescription, setScopeDescription] = useState(document.difusion.alcanceDescripcion || "");
  const [matrixRelations, setMatrixRelations] = useState(matrixInputFromDocument(document.matricesRelacionadas || []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditing(false);
    setTitle(document.titulo);
    setDescription(document.descripcion);
    setIssueDate(toInputDate(document.fechaEmision));
    setExpiration(toInputDate(document.fechaVencimiento));
    setWarningDays(String(document.diasAviso));
    setResponsibleName(document.responsableSistemaGestion.nombre || RESPONSIBLE_DEFAULT.nombre);
    setResponsibleRole(document.responsableSistemaGestion.cargo || RESPONSIBLE_DEFAULT.cargo);
    setRequiresDigital(document.requiereFirmaDigital);
    setScopeDescription(document.difusion.alcanceDescripcion || "");
    setMatrixRelations(matrixInputFromDocument(document.matricesRelacionadas || []));
  }, [document]);

  const save = async () => {
    setSaving(true);
    try {
      await updateCompanyDocument(authenticatedFetch, document.id, {
        titulo: title,
        descripcion: description,
        fechaEmision: issueDate,
        fechaVencimiento: expiration,
        diasAviso: Number(warningDays),
        responsableNombre: responsibleName,
        responsableCargo: responsibleRole,
        requiereFirmaDigital: requiresDigital,
        alcanceDescripcion: scopeDescription,
        matricesRelacionadas: parseMatrixInput(matrixRelations),
      });
      setEditing(false);
      await onRefresh();
      sileo.success({ title: "Información actualizada" });
    } catch (error) {
      sileo.error({ title: "No se pudo actualizar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-bold">Información</h3>
        {canManage && ["vigente", "pendiente_aprobacion", "borrador"].includes(document.estado) && (
          <Button size="sm" variant="light" startContent={<Pencil size={14} />} onPress={() => setEditing((value) => !value)}>
            {editing ? "Cancelar" : "Editar"}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <Input label="Título" value={title} onValueChange={setTitle} />
          <Textarea label="Descripción" value={description} onValueChange={setDescription} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input type="date" label="Emisión" value={issueDate} onValueChange={setIssueDate} />
            <Input type="date" label="Vencimiento" value={expiration} onValueChange={setExpiration} />
            <Input type="number" min={1} max={365} label="Aviso" value={warningDays} onValueChange={setWarningDays} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Responsable SGI" value={responsibleName} onValueChange={setResponsibleName} />
            <Input label="Cargo responsable" value={responsibleRole} onValueChange={setResponsibleRole} />
          </div>
          <Textarea label="Matrices relacionadas" placeholder="CODIGO | Nombre | Detalle" value={matrixRelations} onValueChange={setMatrixRelations} />
          <Textarea label="Alcance de difusión" value={scopeDescription} onValueChange={setScopeDescription} />
          <Checkbox isSelected={requiresDigital} isDisabled={document.firmantesDigitales.length > 0} onValueChange={setRequiresDigital}>
            Requiere firma APP
          </Checkbox>
          <Button color="primary" isLoading={saving} isDisabled={title.trim().length < 2} onPress={() => void save()}>
            Guardar cambios
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">{document.descripcion || "Sin descripción"}</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p><strong>Código:</strong> {document.codigoVersionado || document.codigoBase || `v${document.version}`}</p>
            <p><strong>Estado:</strong> {COMPANY_DOCUMENT_WORKFLOW_LABELS[document.estado]}</p>
            <div className="flex items-center gap-2">
              <strong>Visibilidad:</strong>
              <DocumentVisibilityControl
                document={document}
                canManage={canManage}
                isLoading={visibilitySaving}
                onChange={onVisibilityChange}
              />
            </div>
            <p><strong>Publicado:</strong> {formatDateTime(document.publicadoAt)}</p>
            <p><strong>Emisión:</strong> {formatDate(document.fechaEmision)}</p>
            <p><strong>Vencimiento:</strong> {formatDate(document.fechaVencimiento)}</p>
            <p><strong>Aviso:</strong> {document.diasAviso} días antes</p>
            <p><strong>Responsable SGI:</strong> {document.responsableSistemaGestion.nombre || "-"}</p>
            <p><strong>Cargo responsable:</strong> {document.responsableSistemaGestion.cargo || "-"}</p>
            <p><strong>Difusión:</strong> {document.difusion.estado}</p>
          </div>
          {document.matricesRelacionadas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {document.matricesRelacionadas.map((matrix) => (
                <Chip key={`${matrix.codigo}-${matrix.nombre}`} size="sm" variant="flat">
                  {matrix.codigo}{matrix.nombre ? ` · ${matrix.nombre}` : ""}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RenewDocumentPanel({
  document,
  authenticatedFetch,
  onRenewed,
}: {
  document: CompanyDocument;
  authenticatedFetch: typeof fetch;
  onRenewed: (id: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(document.titulo);
  const [description, setDescription] = useState(document.descripcion);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiration, setExpiration] = useState(toInputDate(document.fechaVencimiento));
  const [warningDays, setWarningDays] = useState(String(document.diasAviso));
  const [codeBase, setCodeBase] = useState(document.codigoBase);
  const [requireApproval, setRequireApproval] = useState(true);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(document.requiereFirmaDigital || document.esGlobal);
  const [responsibleName, setResponsibleName] = useState(document.responsableSistemaGestion.nombre || RESPONSIBLE_DEFAULT.nombre);
  const [responsibleRole, setResponsibleRole] = useState(document.responsableSistemaGestion.cargo || RESPONSIBLE_DEFAULT.cargo);
  const [changeDescription, setChangeDescription] = useState("");
  const [scopeDescription, setScopeDescription] = useState(document.difusion.alcanceDescripcion || "");
  const [matrixRelations, setMatrixRelations] = useState(matrixInputFromDocument(document.matricesRelacionadas || []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFile(null);
    setTitle(document.titulo);
    setDescription(document.descripcion);
    setIssueDate(new Date().toISOString().slice(0, 10));
    setExpiration(toInputDate(document.fechaVencimiento));
    setWarningDays(String(document.diasAviso));
    setCodeBase(document.codigoBase);
    setRequireApproval(true);
    setRequireDigitalSignature(document.requiereFirmaDigital || document.esGlobal);
    setResponsibleName(document.responsableSistemaGestion.nombre || RESPONSIBLE_DEFAULT.nombre);
    setResponsibleRole(document.responsableSistemaGestion.cargo || RESPONSIBLE_DEFAULT.cargo);
    setChangeDescription("");
    setScopeDescription(document.difusion.alcanceDescripcion || "");
    setMatrixRelations(matrixInputFromDocument(document.matricesRelacionadas || []));
  }, [document]);

  const renew = async () => {
    if (!file || !changeDescription.trim()) return;
    if (file.size > 25 * 1024 * 1024) {
      sileo.error({ title: "El archivo supera 25 MB" });
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("titulo", title);
      form.append("descripcion", description);
      form.append("codigoBase", codeBase);
      form.append("fechaEmision", issueDate);
      form.append("fechaVencimiento", expiration);
      form.append("diasAviso", warningDays);
      form.append("requiereAprobacion", String(requireApproval));
      form.append("requiereFirmaDigital", String(requireDigitalSignature));
      form.append("responsableNombre", responsibleName);
      form.append("responsableCargo", responsibleRole);
      form.append("motivoCambio", changeDescription);
      form.append("alcanceDescripcion", scopeDescription);
      form.append("matricesRelacionadas", JSON.stringify(parseMatrixInput(matrixRelations)));
      const next = await renewCompanyDocument(authenticatedFetch, document.id, form);
      await onRenewed(next.id);
      sileo.success({ title: "Nueva versión creada" });
    } catch (error) {
      sileo.error({ title: "No se pudo renovar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold"><RefreshCw size={17} /> Renovar documento</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Input type="file" label="Archivo renovado" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <Input label="Código base" value={codeBase} onValueChange={setCodeBase} />
        <Input label="Título" value={title} onValueChange={setTitle} />
        <Input type="date" label="Nueva emisión" value={issueDate} onValueChange={setIssueDate} />
        <Input type="date" label="Nuevo vencimiento" value={expiration} onValueChange={setExpiration} />
        <Input type="number" min={1} max={365} label="Aviso" value={warningDays} onValueChange={setWarningDays} />
        <Input label="Responsable SGI" value={responsibleName} onValueChange={setResponsibleName} />
        <Input label="Cargo responsable" value={responsibleRole} onValueChange={setResponsibleRole} />
      </div>
      <Textarea className="mt-3" label="Descripción" value={description} onValueChange={setDescription} />
      <Textarea className="mt-3" label="Motivo del cambio" value={changeDescription} onValueChange={setChangeDescription} />
      <Textarea className="mt-3" label="Matrices relacionadas" placeholder="CODIGO | Nombre | Detalle" value={matrixRelations} onValueChange={setMatrixRelations} />
      <Textarea className="mt-3" label="Alcance de difusión" value={scopeDescription} onValueChange={setScopeDescription} />
      <div className="mt-3 flex flex-wrap gap-4">
        <Checkbox isSelected={requireApproval} onValueChange={setRequireApproval}>Aprobación</Checkbox>
        <Checkbox isSelected={requireDigitalSignature} onValueChange={setRequireDigitalSignature}>Firma APP</Checkbox>
      </div>
      <Button className="mt-3" color="primary" variant="flat" isDisabled={!file || !changeDescription.trim()} isLoading={saving} onPress={() => void renew()}>
        Crear nueva versión
      </Button>
    </section>
  );
}

function ApprovalPanel({
  document,
  authenticatedFetch,
  canManage,
  onRefresh,
}: {
  document: CompanyDocument;
  authenticatedFetch: typeof fetch;
  canManage: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [busyType, setBusyType] = useState<ApprovalType | null>(null);

  const submit = async (tipo: ApprovalType, estado: "aprobado" | "rechazado") => {
    setBusyType(tipo);
    try {
      await approveCompanyDocument(authenticatedFetch, document.id, { tipo, estado, comentario: comment });
      setComment("");
      await onRefresh();
      sileo.success({ title: estado === "aprobado" ? "Aprobación registrada" : "Rechazo registrado" });
    } catch (error) {
      sileo.error({ title: "No se pudo registrar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusyType(null);
    }
  };

  if (!document.requiereAprobacion) {
    return (
      <section className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800"><CheckCircle2 size={17} /> Aprobaciones</h3>
        <p>Sin aprobación formal requerida.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold"><CheckCircle2 size={17} /> Aprobaciones</h3>
        <Chip size="sm" color={document.aprobacion.approved ? "success" : "warning"} variant="flat">
          {document.aprobacion.approved ? "Completas" : "Pendientes"}
        </Chip>
      </div>
      <div className="space-y-2">
        {document.aprobaciones.map((approval) => (
          <div key={approval.tipo} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{approvalLabel(approval.tipo)}</p>
                <p className="text-xs text-slate-500">{approval.nombre || "Sin registro"} {approval.firmadoAt ? `· ${formatDateTime(approval.firmadoAt)}` : ""}</p>
                {approval.comentario && <p className="mt-1 text-xs text-slate-600">{approval.comentario}</p>}
              </div>
              <Chip size="sm" color={approvalColor(approval.estado)} variant="flat">{approval.estado}</Chip>
            </div>
            {canManage && (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button size="sm" color="danger" variant="light" isLoading={busyType === approval.tipo} onPress={() => void submit(approval.tipo, "rechazado")}>
                  Rechazar
                </Button>
                <Button size="sm" color="success" variant="flat" isLoading={busyType === approval.tipo} onPress={() => void submit(approval.tipo, "aprobado")}>
                  Aprobar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {canManage && <Textarea className="mt-3" size="sm" label="Comentario" value={comment} onValueChange={setComment} />}
    </section>
  );
}

function DiffusionPanel({
  document,
  authenticatedFetch,
  canManageSignatures,
  onRefresh,
}: {
  document: CompanyDocument;
  authenticatedFetch: typeof fetch;
  canManageSignatures: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [scope, setScope] = useState(document.difusion.alcanceDescripcion || "Todos los trabajadores");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<EvidenceFormat | null>(null);

  useEffect(() => {
    setScope(document.difusion.alcanceDescripcion || "Todos los trabajadores");
  }, [document]);

  const diffuse = async () => {
    setBusy(true);
    try {
      const result = await diffuseCompanyDocument(authenticatedFetch, document.id, {
        objetivo: "todos",
        alcanceDescripcion: scope,
      });
      await onRefresh();
      sileo.success({ title: "Difusión enviada", description: result.message });
    } catch (error) {
      sileo.error({ title: "No se pudo difundir", description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const downloadEvidence = async (format: EvidenceFormat) => {
    setDownloading(format);
    try {
      await downloadAuthenticatedFile(
        authenticatedFetch,
        `/documentoEmpresa/${document.id}/evidencia?format=${format}`,
        `evidencia-${document.codigoVersionado || document.id}.${format}`
      );
    } catch (error) {
      sileo.error({ title: "No se pudo descargar evidencia", description: error instanceof Error ? error.message : undefined });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold"><Send size={17} /> Difusión y firma APP</h3>
        <Chip size="sm" color={document.difusion.estado === "enviada" || document.difusion.estado === "completa" ? "success" : "warning"} variant="flat">
          {document.difusion.estado}
        </Chip>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p><strong>Solicitudes:</strong> {document.firmasDigitales.total}</p>
        <p><strong>Pendientes:</strong> {document.firmasDigitales.pendientes}</p>
        <p><strong>Firmadas:</strong> {document.firmasDigitales.firmados}</p>
        <p><strong>Aceptadas:</strong> {document.firmasDigitales.aceptados}</p>
      </div>
      {canManageSignatures && document.estado === "vigente" && (
        <div className="mt-3 space-y-2">
          <Textarea size="sm" label="Alcance" value={scope} onValueChange={setScope} />
          <Button color="primary" variant="flat" startContent={<Send size={16} />} isLoading={busy} onPress={() => void diffuse()}>
            Difundir a todos
          </Button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="flat" startContent={<Download size={15} />} isLoading={downloading === "pdf"} onPress={() => void downloadEvidence("pdf")}>
          Evidencia PDF
        </Button>
        <Button size="sm" variant="flat" startContent={<Download size={15} />} isLoading={downloading === "csv"} onPress={() => void downloadEvidence("csv")}>
          Evidencia CSV
        </Button>
      </div>
      {document.firmantesDigitales.length > 0 && (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {document.firmantesDigitales.map((signer) => (
            <div key={signer.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <p className="font-semibold">{signer.nombre}</p>
                <p className="text-xs text-slate-500">{signer.rut} · {signer.cargo || "Sin cargo"}</p>
                <p className="text-xs text-slate-500">Visto/firma: {formatDateTime(signer.aceptadoAt || signer.firmadoAt)}</p>
                {signer.codigoValidacion && <p className="text-xs font-semibold text-emerald-700">Código: {signer.codigoValidacion}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Chip size="sm" color={signatureColor(signer.estado)} variant="flat">{signer.estado}</Chip>
                {signer.documentoFirmadoUrl && (
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Download size={14} />}
                    onPress={() => void downloadAuthenticatedFile(
                      authenticatedFetch,
                      signer.documentoFirmadoUrl || "",
                      signer.documentoFirmadoNombre || `firmado-${signer.rut}.pdf`
                    )}
                  >
                    Firmado
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PhysicalSignaturesPanel({
  document,
  authenticatedFetch,
  canManageSignatures,
  candidates,
  onRefresh,
}: {
  document: CompanyDocument;
  authenticatedFetch: typeof fetch;
  canManageSignatures: boolean;
  candidates: SignatureCandidates;
  onRefresh: () => Promise<void>;
}) {
  const [addingWorker, setAddingWorker] = useState("");
  const [externalName, setExternalName] = useState("");
  const [busy, setBusy] = useState(false);

  const addSigner = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await addPhysicalSigner(authenticatedFetch, document.id, body);
      setAddingWorker("");
      setExternalName("");
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 font-bold">Firmas físicas</h3>
      {document.firmantesFisicos.length === 0 ? (
        <p className="text-sm text-slate-500">Sin firmantes físicos.</p>
      ) : (
        <div className="space-y-2">
          {document.firmantesFisicos.map((signer) => (
            <div key={signer.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="font-semibold">{signer.nombre}</p>
                <p className="text-xs text-slate-500">{signer.rut || signer.cargo || signer.tipo}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  color={signer.estado === "firmado" ? "success" : "default"}
                  isDisabled={!canManageSignatures || busy}
                  onPress={async () => {
                    await updatePhysicalSigner(authenticatedFetch, document.id, signer.id, signer.estado === "firmado" ? "pendiente" : "firmado");
                    await onRefresh();
                  }}
                >
                  {signer.estado === "firmado" ? "Firmado" : "Pendiente"}
                </Button>
                {canManageSignatures && signer.estado === "pendiente" && (
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    isDisabled={busy}
                    onPress={async () => {
                      await removePhysicalSigner(authenticatedFetch, document.id, signer.id);
                      await onRefresh();
                    }}
                    aria-label="Quitar firmante"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {canManageSignatures && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Autocomplete
              size="sm"
              label="Agregar trabajador"
              placeholder="Buscar por nombre o RUT"
              selectedKey={addingWorker || null}
              onSelectionChange={(key) => setAddingWorker(key ? String(key) : "")}
              defaultItems={candidates.trabajadores}
            >
              {(worker) => <AutocompleteItem key={worker.id} textValue={`${worker.nombre} · ${worker.rut}`}>{worker.nombre} · {worker.rut}</AutocompleteItem>}
            </Autocomplete>
            <Button className="self-end" size="sm" isLoading={busy} isDisabled={!addingWorker} onPress={() => void addSigner({ tipo: "trabajador", trabajadorId: addingWorker })}>
              Agregar
            </Button>
          </div>
          <div className="flex gap-2">
            <Input size="sm" label="Agregar externo" value={externalName} onValueChange={setExternalName} />
            <Button className="self-end" size="sm" isLoading={busy} isDisabled={!externalName.trim()} onPress={() => void addSigner({ tipo: "externo", nombre: externalName })}>
              Agregar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ChangeControlPanel({ document }: { document: CompanyDocument }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold"><History size={17} /> Control de cambios</h3>
      {document.controlCambios.length === 0 ? (
        <p className="text-sm text-slate-500">Sin cambios registrados.</p>
      ) : (
        <div className="space-y-2">
          {document.controlCambios.map((change, index) => (
            <div key={`${change.version}-${change.fecha || index}`} className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Versión {change.version} · {formatDateTime(change.fecha)}</p>
              <p className="mt-1 text-slate-600">{change.descripcion}</p>
              {change.nombreAutor && <p className="mt-1 text-xs text-slate-500">{change.nombreAutor}</p>}
            </div>
          ))}
        </div>
      )}
      {document.documentosRelacionados.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Documentos enlazados</p>
          <div className="flex flex-wrap gap-2">
            {document.documentosRelacionados.map((relation) => (
              <Chip key={`${relation.documentoId}-${relation.tipoRelacion}`} size="sm" variant="flat">
                {relation.codigoVersionado || relation.titulo || relation.documentoId}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ChangeControlModal({
  isOpen,
  onClose,
  authenticatedFetch,
}: {
  isOpen: boolean;
  onClose: () => void;
  authenticatedFetch: typeof fetch;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CompanyDocumentChangeControlItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getCompanyDocumentChangeControl(authenticatedFetch)
      .then(setItems)
      .catch((error) => sileo.error({ title: "No se pudo cargar la matriz", description: error instanceof Error ? error.message : undefined }))
      .finally(() => setLoading(false));
  }, [authenticatedFetch, isOpen]);

  const exportCsv = () => {
    const rows = [
      ["codigo", "version", "titulo", "categoria", "estado", "emision", "vencimiento", "matrices", "control_cambios"],
      ...items.map((item) => [
        item.codigoVersionado || item.codigoBase,
        String(item.version),
        item.titulo,
        item.categoria,
        COMPANY_DOCUMENT_WORKFLOW_LABELS[item.estado],
        formatDate(item.fechaEmision),
        formatDate(item.fechaVencimiento),
        item.matricesRelacionadas.map((matrix) => matrix.codigo).join(", "),
        item.controlCambios.map((change) => `v${change.version}: ${change.descripcion}`).join(" | "),
      ]),
    ];
    downloadLocalCsv("matriz-control-cambios.csv", rows);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside" classNames={{ base: "w-[94vw] !max-w-[1500px] max-h-[94vh]" }}>
      <ModalContent>
        <ModalHeader className="flex items-center justify-between gap-3 pr-12">
          <span>Matriz de control de cambios</span>
          <Button size="sm" variant="flat" startContent={<Download size={15} />} isDisabled={items.length === 0} onPress={exportCsv}>
            CSV
          </Button>
        </ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="grid min-h-64 place-items-center"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Documento</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Vencimiento</th>
                    <th className="px-3 py-3">Matrices</th>
                    <th className="px-3 py-3">Último cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const lastChange = item.controlCambios[item.controlCambios.length - 1];
                    return (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-3">{item.codigoVersionado || item.codigoBase || `v${item.version}`}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{item.titulo}</p>
                          <p className="text-xs text-slate-500">{item.categoria}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Chip size="sm" color={workflowColor(item.estado)} variant="flat">
                            {COMPANY_DOCUMENT_WORKFLOW_LABELS[item.estado]}
                          </Chip>
                        </td>
                        <td className="px-3 py-3">{formatDate(item.fechaVencimiento)}</td>
                        <td className="px-3 py-3">{item.matricesRelacionadas.map((matrix) => matrix.codigo).join(", ") || "-"}</td>
                        <td className="px-3 py-3">{lastChange?.descripcion || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ModalBody>
        <ModalFooter><Button variant="light" onPress={onClose}>Cerrar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DocumentDetailModal({
  document,
  onClose,
  authenticatedFetch,
  canManage,
  canManageSignatures,
  candidates,
  visibilitySavingId,
  onVisibilityChange,
  onRefresh,
}: {
  document: CompanyDocument | null;
  onClose: () => void;
  authenticatedFetch: typeof fetch;
  canManage: boolean;
  canManageSignatures: boolean;
  candidates: SignatureCandidates;
  visibilitySavingId: string | null;
  onVisibilityChange: (document: CompanyDocument, nextIsGlobal: boolean) => Promise<void> | void;
  onRefresh: (id: string) => Promise<void>;
}) {
  if (!document) return null;
  const refresh = () => onRefresh(document.id);

  return (
    <Modal isOpen onClose={onClose} size="5xl" scrollBehavior="inside" classNames={{ base: "w-[94vw] !max-w-[1500px] max-h-[94vh]" }}>
      <ModalContent>
        <ModalHeader className="flex items-center justify-between pr-12">
          <div>
            <p>{document.titulo}</p>
            <p className="text-xs font-normal text-slate-500">{document.categoria.nombre} · {document.codigoVersionado || `versión ${document.version}`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip color={workflowColor(document.estado)} variant="flat">{COMPANY_DOCUMENT_WORKFLOW_LABELS[document.estado]}</Chip>
            <Chip color={statusColor(document.estadoVencimiento)} variant="flat">{COMPANY_DOCUMENT_STATUS_LABELS[document.estadoVencimiento]}</Chip>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <DocumentPreview document={document} />
              <div className="flex flex-wrap gap-2">
                <Button startContent={<Download size={16} />} onPress={() => void downloadAuthenticatedFile(authenticatedFetch, document.archivo.url, document.archivo.nombre)}>
                  Descargar · {formatBytes(document.archivo.tamano)}
                </Button>
                {canManage && document.estado === "vigente" && (
                  <Button
                    color="danger"
                    variant="light"
                    startContent={<Archive size={16} />}
                    onPress={async () => {
                      if (confirm("El documento se archivará sin eliminar su archivo.")) {
                        await archiveCompanyDocument(authenticatedFetch, document.id);
                        onClose();
                      }
                    }}
                  >
                    Archivar
                  </Button>
                )}
              </div>
              {canManage && document.estado === "vigente" && <RenewDocumentPanel document={document} authenticatedFetch={authenticatedFetch} onRenewed={onRefresh} />}
              <DocumentMetadataPanel
                document={document}
                authenticatedFetch={authenticatedFetch}
                canManage={canManage}
                visibilitySaving={visibilitySavingId === document.id}
                onVisibilityChange={(nextIsGlobal) => onVisibilityChange(document, nextIsGlobal)}
                onRefresh={refresh}
              />
              <ChangeControlPanel document={document} />
              {document.historial && document.historial.length > 1 && (
                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><History size={18} /> Historial</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.historial.map((version) => (
                      <Button key={version.id} size="sm" variant={version.id === document.id ? "solid" : "flat"} onPress={() => void onRefresh(version.id)}>
                        Versión {version.version} · {formatDate(version.createdAt)}
                      </Button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-4">
              <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <h3 className="mb-2 flex items-center gap-2 font-bold"><FileCheck2 size={17} /> Registro SGI</h3>
                <div className="grid gap-2">
                  <p><strong>Código:</strong> {document.codigoVersionado || document.codigoBase || "-"}</p>
                  <p><strong>Responsable:</strong> {document.responsableSistemaGestion.nombre || "-"}</p>
                  <p><strong>Cargo:</strong> {document.responsableSistemaGestion.cargo || "-"}</p>
                  <p><strong>Alcance:</strong> {document.difusion.alcanceDescripcion || "-"}</p>
                </div>
              </section>
              <ApprovalPanel document={document} authenticatedFetch={authenticatedFetch} canManage={canManage} onRefresh={refresh} />
              <DiffusionPanel document={document} authenticatedFetch={authenticatedFetch} canManageSignatures={canManageSignatures} onRefresh={refresh} />
              {!document.esGlobal && (
                <PhysicalSignaturesPanel
                  document={document}
                  authenticatedFetch={authenticatedFetch}
                  canManageSignatures={canManageSignatures}
                  candidates={candidates}
                  onRefresh={refresh}
                />
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter><Button variant="light" onPress={onClose}>Cerrar</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
