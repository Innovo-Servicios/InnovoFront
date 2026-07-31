export type CompanyDocumentExpirationStatus =
  | "vigente"
  | "por_vencer"
  | "vencido"
  | "reemplazado"
  | "archivado";

export interface CompanyDocumentCategory {
  id: string;
  nombre: string;
  descripcion: string;
  slug: string;
  activo: boolean;
  documentos?: number;
}

export interface PhysicalSigner {
  id: string;
  tipo: "trabajador" | "externo";
  trabajadorId?: string | null;
  nombre: string;
  rut: string;
  cargo: string;
  estado: "pendiente" | "firmado";
  firmadoAt?: string | null;
}

export interface DigitalSigner {
  id: string;
  trabajadorId: string;
  nombre: string;
  rut: string;
  cargo: string;
  notificacionId?: string | null;
  validacionId?: string | null;
  estado: "pendiente" | "firmado" | "aceptado" | "vencido" | "bloqueado";
  expiresAt?: string | null;
  firmadoAt?: string | null;
  aceptadoAt?: string | null;
}

export interface CompanyDocument {
  id: string;
  serieId: string;
  version: number;
  documentoAnteriorId?: string | null;
  categoria: CompanyDocumentCategory;
  titulo: string;
  descripcion: string;
  esGlobal: boolean;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  diasAviso: number;
  estado: "vigente" | "reemplazado" | "archivado";
  estadoVencimiento: CompanyDocumentExpirationStatus;
  archivo: { nombre: string; mimeType: string; tamano: number; url: string };
  firmantesFisicos: PhysicalSigner[];
  firmantesDigitales: DigitalSigner[];
  firmas: { completadas: number; total: number };
  historial?: CompanyDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDocumentSummary {
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
  firmasPendientes: number;
}

export interface SignatureCandidateWorker {
  id: string;
  nombre: string;
  rut: string;
  arquetipo: string;
  rolId?: string | null;
}

export interface SignatureCandidateRole {
  id: string;
  nombre: string;
  arquetipo: string;
}

export interface SignatureCandidates {
  trabajadores: SignatureCandidateWorker[];
  roles: SignatureCandidateRole[];
}

export const COMPANY_DOCUMENT_STATUS_LABELS: Record<CompanyDocumentExpirationStatus, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  reemplazado: "Reemplazado",
  archivado: "Archivado",
};
