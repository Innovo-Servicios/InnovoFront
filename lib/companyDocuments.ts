export type CompanyDocumentExpirationStatus =
  | "vigente"
  | "por_vencer"
  | "vencido"
  | "reemplazado"
  | "archivado";

export type CompanyDocumentWorkflowStatus =
  | "borrador"
  | "pendiente_aprobacion"
  | "vigente"
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
  codigoValidacion?: string | null;
  documentoFirmadoUrl?: string | null;
  documentoFirmadoNombre?: string | null;
  verificacionUrl?: string | null;
}

export interface CompanyDocumentApproval {
  tipo: "gerencia" | "prevencion";
  estado: "pendiente" | "aprobado" | "rechazado";
  aprobadorId?: string | null;
  nombre: string;
  rut: string;
  cargo: string;
  comentario: string;
  firmadoAt?: string | null;
}

export interface CompanyDocumentApprovalSummary {
  required: boolean;
  approved: boolean;
  pending: Array<"gerencia" | "prevencion">;
}

export interface CompanyDocumentChange {
  version: number;
  fecha?: string | null;
  descripcion: string;
  autorId?: string | null;
  nombreAutor: string;
}

export interface CompanyDocumentRelation {
  documentoId: string;
  tipoRelacion: "matriz" | "referencia" | "reemplaza" | "anexo" | "otro";
  descripcion: string;
  titulo: string;
  codigoVersionado: string;
}

export interface CompanyDocumentMatrixRelation {
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface CompanyDocumentChangeControlItem {
  id: string;
  serieId: string;
  codigoBase: string;
  codigoVersionado: string;
  version: number;
  titulo: string;
  categoria: string;
  estado: CompanyDocumentWorkflowStatus;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  controlCambios: CompanyDocumentChange[];
  matricesRelacionadas: CompanyDocumentMatrixRelation[];
  documentosRelacionados: Array<Pick<CompanyDocumentRelation, "documentoId" | "tipoRelacion" | "descripcion">>;
}

export interface CompanyDocumentEvidence {
  generadoAt: string;
  documento: {
    id: string;
    titulo: string;
    codigoBase: string;
    codigoVersionado: string;
    version: number;
    categoria: string;
    estado: CompanyDocumentWorkflowStatus;
    estadoVencimiento: CompanyDocumentExpirationStatus;
    fechaEmision?: string | null;
    fechaVencimiento?: string | null;
    archivo: string;
    responsableSistemaGestion?: { nombre: string; cargo: string } | null;
  };
  resumen: {
    enviados: number;
    vistos: number;
    pendientes: number;
    firmados: number;
    aceptados: number;
    vencidos: number;
    bloqueados: number;
  };
  filas: Array<{
    trabajadorId: string;
    rut: string;
    nombre: string;
    cargo: string;
    notificacionId: string;
    enviado: boolean;
    vistoAt?: string | null;
    estadoFirma: DigitalSigner["estado"];
    firmadoAt?: string | null;
    aceptadoAt?: string | null;
    codigoValidacion?: string;
    documentoFirmado?: string;
    vencimientoCodigo?: string | null;
    intentos: number;
  }>;
}

export interface CompanyDocumentDigitalSignatureSummary {
  total: number;
  pendientes: number;
  firmados: number;
  aceptados: number;
  vencidos: number;
  bloqueados: number;
}

export interface CompanyDocumentDiffusion {
  estado: "no_requerida" | "pendiente" | "enviada" | "completa";
  ultimaNotificacionId?: string | null;
  difundidoAt?: string | null;
  alcanceDescripcion: string;
}

export interface CompanyDocument {
  id: string;
  serieId: string;
  version: number;
  codigoBase: string;
  codigoVersionado: string;
  documentoAnteriorId?: string | null;
  categoria: CompanyDocumentCategory;
  titulo: string;
  descripcion: string;
  esGlobal: boolean;
  requiereAprobacion: boolean;
  requiereFirmaDigital: boolean;
  responsableSistemaGestion: { nombre: string; cargo: string };
  plantillaDocumental?: {
    plantillaId?: string | null;
    nombre: string;
    version: number;
  } | null;
  aprobaciones: CompanyDocumentApproval[];
  aprobacion: CompanyDocumentApprovalSummary;
  controlCambios: CompanyDocumentChange[];
  documentosRelacionados: CompanyDocumentRelation[];
  matricesRelacionadas: CompanyDocumentMatrixRelation[];
  publicadoAt?: string | null;
  difusion: CompanyDocumentDiffusion;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  diasAviso: number;
  estado: CompanyDocumentWorkflowStatus;
  estadoVencimiento: CompanyDocumentExpirationStatus;
  archivo: { nombre: string; mimeType: string; tamano: number; url: string };
  firmantesFisicos: PhysicalSigner[];
  firmantesDigitales: DigitalSigner[];
  firmas: { completadas: number; total: number };
  firmasDigitales: CompanyDocumentDigitalSignatureSummary;
  historial?: CompanyDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDocumentTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  contenido: string;
  textoAceptacion: string;
  codigoBase: string;
  categoriaId?: string | null;
  categoria?: CompanyDocumentCategory | null;
  version: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDocumentSummary {
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
  firmasPendientes: number;
  pendientesAprobacion?: number;
  firmasDigitalesPendientes?: number;
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

export const COMPANY_DOCUMENT_WORKFLOW_LABELS: Record<CompanyDocumentWorkflowStatus, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente de aprobación",
  vigente: "Publicado",
  reemplazado: "Reemplazado",
  archivado: "Archivado",
};
