import { URL } from "@/config/config";
import type {
  CompanyDocument,
  CompanyDocumentCategory,
  CompanyDocumentChangeControlItem,
  CompanyDocumentEvidence,
  CompanyDocumentSummary,
  CompanyDocumentTemplate,
  SignatureCandidates,
} from "@/lib/companyDocuments";

type Fetcher = typeof fetch;

async function request<T>(fetcher: Fetcher, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetcher(`${URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
    throw new Error(payload?.message || "No se pudo completar la operación");
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const getCompanyDocumentCategories = (fetcher: Fetcher) =>
  request<CompanyDocumentCategory[]>(fetcher, "/documentoEmpresa/categorias");

export const createCompanyDocumentCategory = (fetcher: Fetcher, body: { nombre: string; descripcion: string }) =>
  request<CompanyDocumentCategory>(fetcher, "/documentoEmpresa/categorias", { method: "POST", body: JSON.stringify(body) });

export const updateCompanyDocumentCategory = (fetcher: Fetcher, id: string, body: { nombre: string; descripcion: string }) =>
  request<CompanyDocumentCategory>(fetcher, `/documentoEmpresa/categorias/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const archiveCompanyDocumentCategory = (fetcher: Fetcher, id: string) =>
  request<void>(fetcher, `/documentoEmpresa/categorias/${id}`, { method: "DELETE" });

export const getCompanyDocuments = (fetcher: Fetcher, params: URLSearchParams) =>
  request<{ items: CompanyDocument[]; total: number; page: number; pages: number }>(fetcher, `/documentoEmpresa?${params}`);

export const getCompanyDocument = (fetcher: Fetcher, id: string) =>
  request<CompanyDocument>(fetcher, `/documentoEmpresa/${id}`);

export const getCompanyDocumentSummary = (fetcher: Fetcher) =>
  request<CompanyDocumentSummary>(fetcher, "/documentoEmpresa/resumen");

export const getCompanyDocumentCandidates = (fetcher: Fetcher) =>
  request<SignatureCandidates>(fetcher, "/documentoEmpresa/firmantes/candidatos");

export const getCompanyDocumentTemplates = (fetcher: Fetcher) =>
  request<CompanyDocumentTemplate[]>(fetcher, "/documentoEmpresa/plantillas");

export const createCompanyDocumentTemplate = (
  fetcher: Fetcher,
  body: {
    nombre: string;
    descripcion?: string;
    contenido: string;
    textoAceptacion?: string;
    codigoBase?: string;
    categoriaId?: string;
  }
) =>
  request<CompanyDocumentTemplate>(fetcher, "/documentoEmpresa/plantillas", { method: "POST", body: JSON.stringify(body) });

export const updateCompanyDocumentTemplate = (
  fetcher: Fetcher,
  id: string,
  body: {
    nombre: string;
    descripcion?: string;
    contenido: string;
    textoAceptacion?: string;
    codigoBase?: string;
    categoriaId?: string;
  }
) =>
  request<CompanyDocumentTemplate>(fetcher, `/documentoEmpresa/plantillas/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const archiveCompanyDocumentTemplate = (fetcher: Fetcher, id: string) =>
  request<void>(fetcher, `/documentoEmpresa/plantillas/${id}`, { method: "DELETE" });

export const sendCompanyDocumentTemplate = (
  fetcher: Fetcher,
  id: string,
  body: {
    titulo?: string;
    descripcion?: string;
    categoriaId: string;
    codigoBase?: string;
    fechaEmision?: string;
    fechaVencimiento?: string;
    diasAviso?: number;
    responsableNombre?: string;
    responsableCargo?: string;
    alcanceDescripcion?: string;
    motivoCambio?: string;
  }
) =>
  request<{ message: string; document: CompanyDocument; codigos: Array<{ trabajadorId: string; rut: string; nombre: string; code: string }> }>(
    fetcher,
    `/documentoEmpresa/plantillas/${id}/enviar`,
    { method: "POST", body: JSON.stringify(body) }
  );

export const createCompanyDocument = (fetcher: Fetcher, body: FormData) =>
  request<CompanyDocument>(fetcher, "/documentoEmpresa", { method: "POST", body });

export const updateCompanyDocument = (fetcher: Fetcher, id: string, body: Record<string, unknown>) =>
  request<CompanyDocument>(fetcher, `/documentoEmpresa/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const archiveCompanyDocument = (fetcher: Fetcher, id: string) =>
  request<void>(fetcher, `/documentoEmpresa/${id}`, { method: "DELETE" });

export const renewCompanyDocument = (fetcher: Fetcher, id: string, body: FormData) =>
  request<CompanyDocument>(fetcher, `/documentoEmpresa/${id}/renovar`, { method: "POST", body });

export const approveCompanyDocument = (
  fetcher: Fetcher,
  id: string,
  body: { tipo: "gerencia" | "prevencion"; estado?: "aprobado" | "rechazado"; comentario?: string }
) =>
  request<CompanyDocument>(fetcher, `/documentoEmpresa/${id}/aprobaciones`, { method: "POST", body: JSON.stringify(body) });

export const diffuseCompanyDocument = (
  fetcher: Fetcher,
  id: string,
  body: { objetivo?: "todos"; trabajadores?: string[]; mensaje?: string; alcanceDescripcion?: string } = {}
) =>
  request<{ message: string; document: CompanyDocument; codigos: string[] }>(
    fetcher,
    `/documentoEmpresa/${id}/difundir`,
    { method: "POST", body: JSON.stringify(body) }
  );

export const getCompanyDocumentChangeControl = (fetcher: Fetcher) =>
  request<CompanyDocumentChangeControlItem[]>(fetcher, "/documentoEmpresa/control-cambios");

export const getCompanyDocumentEvidence = (fetcher: Fetcher, id: string) =>
  request<CompanyDocumentEvidence>(fetcher, `/documentoEmpresa/${id}/evidencia`);

export const addPhysicalSigner = (fetcher: Fetcher, id: string, body: Record<string, unknown>) =>
  request<CompanyDocument>(fetcher, `/documentoEmpresa/${id}/firmantes`, { method: "POST", body: JSON.stringify(body) });

export const updatePhysicalSigner = (fetcher: Fetcher, id: string, signerId: string, estado: "pendiente" | "firmado") =>
  request<CompanyDocument>(fetcher, `/documentoEmpresa/${id}/firmantes/${signerId}`, { method: "PUT", body: JSON.stringify({ estado }) });

export const removePhysicalSigner = (fetcher: Fetcher, id: string, signerId: string) =>
  request<void>(fetcher, `/documentoEmpresa/${id}/firmantes/${signerId}`, { method: "DELETE" });
