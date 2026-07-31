import { URL } from "@/config/config";
import type {
  AccessRole,
  PermissionDefinition,
  RoleArchetype,
} from "@/lib/accessControl";

type Fetcher = typeof fetch;

async function jsonRequest<T>(
  fetcher: Fetcher,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetcher(`${URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "No se pudo completar la operación");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const getPermissionCatalog = (fetcher: Fetcher) =>
  jsonRequest<PermissionDefinition[]>(fetcher, "/permiso/catalogo");

export const updatePermission = (
  fetcher: Fetcher,
  clave: string,
  body: Pick<PermissionDefinition, "nombre" | "descripcion">
) => jsonRequest<PermissionDefinition>(fetcher, `/permiso/${encodeURIComponent(clave)}`, {
  method: "PATCH",
  body: JSON.stringify(body),
});

export const getRoles = (fetcher: Fetcher) =>
  jsonRequest<AccessRole[]>(fetcher, "/rol");

export const createRole = (
  fetcher: Fetcher,
  body: Pick<AccessRole, "nombre" | "descripcion" | "arquetipo" | "permisos">
) => jsonRequest<AccessRole>(fetcher, "/rol", { method: "POST", body: JSON.stringify(body) });

export const updateRole = (
  fetcher: Fetcher,
  id: string,
  body: Pick<AccessRole, "nombre" | "descripcion" | "permisos">
) => jsonRequest<AccessRole>(fetcher, `/rol/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const archiveRole = (fetcher: Fetcher, id: string) =>
  jsonRequest<void>(fetcher, `/rol/${id}`, { method: "DELETE" });

export const getRoleArchetypes = (fetcher: Fetcher) =>
  jsonRequest<RoleArchetype[]>(fetcher, "/rol/arquetipos");

export const updateRoleArchetype = (
  fetcher: Fetcher,
  clave: string,
  body: Pick<RoleArchetype, "nombre" | "descripcion" | "permisosPredeterminados">
) => jsonRequest<RoleArchetype>(fetcher, `/rol/arquetipos/${clave}`, {
  method: "PUT",
  body: JSON.stringify(body),
});

export const assignWorkerRole = (fetcher: Fetcher, workerId: string, rolId: string) =>
  jsonRequest(fetcher, `/rol/asignacion/${workerId}`, { method: "PUT", body: JSON.stringify({ rolId }) });

export const assignTemporaryWorkerRole = (
  fetcher: Fetcher,
  workerId: string,
  rolId: string,
  expiracion: string
) => jsonRequest(fetcher, `/rol/asignacion/${workerId}/temporal`, {
  method: "PUT",
  body: JSON.stringify({ rolId, expiracion }),
});

export const removeTemporaryWorkerRole = (fetcher: Fetcher, workerId: string) =>
  jsonRequest<void>(fetcher, `/rol/asignacion/${workerId}/temporal`, { method: "DELETE" });
