export type ArchetypeKey = "administracion" | "supervisor" | "inspector" | "lector";

export interface AccessRoleSummary {
  id: string;
  nombre: string;
  descripcion?: string;
  arquetipo: ArchetypeKey;
  esTemporal?: boolean;
}

export interface AccessSession {
  usuario: {
    id: string;
    rut: string;
    nombre: string;
    correo: string;
  };
  rol: AccessRoleSummary | null;
  rolPermanente: AccessRoleSummary | null;
  rolTemporal: (AccessRoleSummary & { expiracion: string }) | null;
  arquetipo: ArchetypeKey;
  cargo: ArchetypeKey;
  permisos: string[];
}

export interface PermissionDefinition {
  id: string;
  clave: string;
  modulo: string;
  accion: string;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
}

export interface RoleArchetype {
  clave: ArchetypeKey;
  nombre: string;
  descripcion: string;
  permisosPredeterminados: string[];
  activo: boolean;
}

export interface AccessRole {
  id: string;
  nombre: string;
  descripcion: string;
  arquetipo: ArchetypeKey;
  permisos: string[];
  activo: boolean;
  esBase: boolean;
  asignados: number;
}

export const ARCHETYPE_LABELS: Record<ArchetypeKey, string> = {
  administracion: "Administración",
  supervisor: "Supervisor",
  inspector: "Inspector",
  lector: "Lector",
};

export const ADMIN_ROUTE_PERMISSIONS: Array<{
  href: string;
  permission: string;
}> = [
  { href: "/adm/roles", permission: "accesos.ver" },
  { href: "/adm/documentos", permission: "documentos_empresa.ver" },
  { href: "/adm/asignaciones", permission: "asignaciones.ver" },
  { href: "/adm/workers", permission: "trabajadores.ver" },
  { href: "/adm/followup", permission: "seguimiento.ver" },
  { href: "/adm/notification", permission: "notificaciones.ver" },
  { href: "/adm/novedades", permission: "novedades.ver" },
  { href: "/adm/verificaciones", permission: "validaciones_terreno.ver" },
  { href: "/adm/rutas", permission: "rutas.ver" },
  { href: "/adm/direcciones", permission: "direcciones.ver" },
  { href: "/adm", permission: "panel.ver" },
];

export const permissionForPath = (pathname: string) =>
  ADMIN_ROUTE_PERMISSIONS.find(({ href }) =>
    href === "/adm" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  )?.permission;
