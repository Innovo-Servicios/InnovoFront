"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { Archive, KeyRound, Pencil, Plus, ShieldCheck } from "lucide-react";
import { sileo } from "sileo";
import { useAuth } from "@/app/AuthContext";
import {
  archiveRole,
  createRole,
  getPermissionCatalog,
  getRoleArchetypes,
  getRoles,
  updatePermission,
  updateRole,
  updateRoleArchetype,
} from "@/api/adm/accessControl";
import type {
  AccessRole,
  ArchetypeKey,
  PermissionDefinition,
  RoleArchetype,
} from "@/lib/accessControl";
import { ARCHETYPE_LABELS } from "@/lib/accessControl";

type EditorState =
  | { kind: "role"; value: AccessRole | null }
  | { kind: "archetype"; value: RoleArchetype }
  | { kind: "permission"; value: PermissionDefinition };

function PermissionMatrix({
  permissions,
  selected,
  disabled,
  protectedKeys = [],
  onChange,
}: {
  permissions: PermissionDefinition[];
  selected: string[];
  disabled?: boolean;
  protectedKeys?: string[];
  onChange: (keys: string[]) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    permissions.forEach((permission) => {
      map.set(permission.modulo, [...(map.get(permission.modulo) || []), permission]);
    });
    return Array.from(map.entries());
  }, [permissions]);
  const selectedSet = new Set(selected);

  const toggle = (key: string) => {
    if (disabled) return;
    onChange(selectedSet.has(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {grouped.map(([module, items]) => (
        <section key={module} className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{module}</h3>
            <button
              type="button"
              disabled={disabled}
              className="text-xs text-primary disabled:text-slate-300"
              onClick={() => {
                const moduleKeys = items.map(({ clave }) => clave);
                const allSelected = moduleKeys.every((key) => selectedSet.has(key));
                onChange(allSelected
                  ? selected.filter((key) => !moduleKeys.includes(key) || protectedKeys.includes(key))
                  : Array.from(new Set([...selected, ...moduleKeys])));
              }}
            >
              {items.every(({ clave }) => selectedSet.has(clave)) ? "Quitar todos" : "Seleccionar todos"}
            </button>
          </div>
          <div className="space-y-2">
            {items.map((permission) => (
              <label key={permission.clave} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedSet.has(permission.clave)}
                  disabled={disabled || protectedKeys.includes(permission.clave)}
                  onChange={() => toggle(permission.clave)}
                />
                <span>
                  <span className="block font-medium text-slate-700">{permission.nombre}</span>
                  <span className="text-xs text-slate-400">{permission.clave}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function RolesPage() {
  const { authenticatedFetch, hasPermission } = useAuth();
  const canManage = hasPermission("accesos.gestionar");
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [archetypes, setArchetypes] = useState<RoleArchetype[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [archetype, setArchetype] = useState<ArchetypeKey>("lector");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRoles, nextArchetypes, nextPermissions] = await Promise.all([
        getRoles(authenticatedFetch),
        getRoleArchetypes(authenticatedFetch),
        getPermissionCatalog(authenticatedFetch),
      ]);
      setRoles(nextRoles);
      setArchetypes(nextArchetypes);
      setPermissions(nextPermissions);
    } catch (error) {
      sileo.error({ title: "No se pudo cargar el control de acceso", description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const openRoleEditor = (role: AccessRole | null) => {
    const defaultArchetype = role?.arquetipo || archetypes[0]?.clave || "lector";
    const template = archetypes.find(({ clave }) => clave === defaultArchetype);
    setName(role?.nombre || "");
    setDescription(role?.descripcion || "");
    setArchetype(defaultArchetype);
    setSelectedPermissions(role?.permisos || template?.permisosPredeterminados || []);
    setEditor({ kind: "role", value: role });
  };

  const openArchetypeEditor = (item: RoleArchetype) => {
    setName(item.nombre);
    setDescription(item.descripcion);
    setArchetype(item.clave);
    setSelectedPermissions(item.permisosPredeterminados);
    setEditor({ kind: "archetype", value: item });
  };

  const openPermissionEditor = (item: PermissionDefinition) => {
    setName(item.nombre);
    setDescription(item.descripcion);
    setEditor({ kind: "permission", value: item });
  };

  const handleArchetypeChange = (next: ArchetypeKey) => {
    setArchetype(next);
    const template = archetypes.find(({ clave }) => clave === next);
    setSelectedPermissions(template?.permisosPredeterminados || []);
  };

  const saveEditor = async () => {
    if (!editor || name.trim().length < 2) return;
    setSaving(true);
    try {
      if (editor.kind === "role") {
        if (editor.value) {
          await updateRole(authenticatedFetch, editor.value.id, { nombre: name, descripcion: description, permisos: selectedPermissions });
        } else {
          await createRole(authenticatedFetch, { nombre: name, descripcion: description, arquetipo: archetype, permisos: selectedPermissions });
        }
      } else if (editor.kind === "archetype") {
        await updateRoleArchetype(authenticatedFetch, editor.value.clave, {
          nombre: name,
          descripcion: description,
          permisosPredeterminados: selectedPermissions,
        });
      } else {
        await updatePermission(authenticatedFetch, editor.value.clave, { nombre: name, descripcion: description });
      }
      setEditor(null);
      await loadData();
      sileo.success({ title: "Control de acceso actualizado" });
    } catch (error) {
      sileo.error({ title: "No se pudo guardar", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (role: AccessRole) => {
    if (!window.confirm(`¿Archivar el rol “${role.nombre}”?`)) return;
    try {
      await archiveRole(authenticatedFetch, role.id);
      await loadData();
      sileo.success({ title: "Rol archivado" });
    } catch (error) {
      sileo.error({ title: "No se pudo archivar", description: error instanceof Error ? error.message : undefined });
    }
  };

  if (loading) return <div className="grid h-full place-items-center"><Spinner label="Cargando roles..." /></div>;

  return (
    <div className="h-full overflow-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Roles y permisos</h1>
            <p className="mt-1 text-slate-500">Configura accesos sin alterar la función operativa de cada arquetipo.</p>
          </div>
          {canManage && <Button color="primary" startContent={<Plus size={18} />} onPress={() => openRoleEditor(null)}>Crear rol</Button>}
        </div>

        <Tabs aria-label="Administración del control de acceso" color="primary" variant="underlined">
          <Tab key="roles" title="Roles">
            <div className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <Card key={role.id} className={!role.activo ? "opacity-60" : ""}>
                  <CardHeader className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2"><KeyRound size={18} className="text-primary" /><h2 className="font-bold">{role.nombre}</h2></div>
                      <p className="mt-1 text-sm text-slate-500">{role.descripcion || "Sin descripción"}</p>
                    </div>
                    <Chip size="sm" variant="flat">{ARCHETYPE_LABELS[role.arquetipo]}</Chip>
                  </CardHeader>
                  <CardBody className="gap-3">
                    <div className="flex gap-2 text-sm text-slate-500">
                      <span>{role.permisos.length} permisos</span><span>•</span><span>{role.asignados} asignados</span>
                    </div>
                    {canManage && role.activo && <div className="flex gap-2">
                      <Button size="sm" variant="flat" startContent={<Pencil size={15} />} onPress={() => openRoleEditor(role)}>Editar</Button>
                      <Button size="sm" color="danger" variant="light" startContent={<Archive size={15} />} isDisabled={role.asignados > 0} onPress={() => handleArchive(role)}>Archivar</Button>
                    </div>}
                  </CardBody>
                </Card>
              ))}
            </div>
          </Tab>

          <Tab key="archetypes" title="Arquetipos">
            <div className="grid gap-4 pt-4 md:grid-cols-2">
              {archetypes.map((item) => (
                <Card key={item.clave}>
                  <CardHeader className="flex justify-between"><div className="flex items-center gap-2"><ShieldCheck className="text-primary" size={20} /><h2 className="font-bold">{item.nombre}</h2></div><Chip size="sm">{item.clave}</Chip></CardHeader>
                  <CardBody className="gap-3"><p className="text-sm text-slate-500">{item.descripcion}</p><p className="text-sm">{item.permisosPredeterminados.length} permisos predeterminados</p>{canManage && <Button size="sm" variant="flat" onPress={() => openArchetypeEditor(item)}>Editar plantilla</Button>}</CardBody>
                </Card>
              ))}
            </div>
          </Tab>

          <Tab key="permissions" title="Permisos">
            <div className="mt-4 overflow-hidden rounded-xl border bg-white">
              {permissions.map((permission) => (
                <div key={permission.clave} className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0">
                  <div><p className="font-medium text-slate-800">{permission.nombre}</p><p className="text-sm text-slate-500">{permission.descripcion}</p><code className="text-xs text-primary">{permission.clave}</code></div>
                  <div className="flex items-center gap-2"><Chip size="sm" variant="flat">{permission.modulo}</Chip>{canManage && <Button isIconOnly size="sm" variant="light" aria-label="Editar permiso" onPress={() => openPermissionEditor(permission)}><Pencil size={16} /></Button>}</div>
                </div>
              ))}
            </div>
          </Tab>
        </Tabs>
      </div>

      <Modal isOpen={Boolean(editor)} onClose={() => setEditor(null)} size={editor?.kind === "permission" ? "lg" : "5xl"} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{editor?.kind === "role" ? editor.value ? "Editar rol" : "Crear rol" : editor?.kind === "archetype" ? "Editar arquetipo" : "Describir permiso"}</ModalHeader>
          <ModalBody className="gap-4">
            <Input label="Nombre" value={name} onValueChange={setName} />
            <Textarea label="Descripción" value={description} onValueChange={setDescription} />
            {editor?.kind === "role" && !editor.value && (
              <div><p className="mb-2 text-sm font-medium">Arquetipo operativo</p><div className="flex flex-wrap gap-2">{archetypes.map((item) => <Button key={item.clave} size="sm" color={archetype === item.clave ? "primary" : "default"} variant={archetype === item.clave ? "solid" : "flat"} onPress={() => handleArchetypeChange(item.clave)}>{item.nombre}</Button>)}</div></div>
            )}
            {editor && editor.kind !== "permission" && <PermissionMatrix permissions={permissions} selected={selectedPermissions} protectedKeys={(editor.kind === "archetype" ? editor.value.clave : editor.value?.arquetipo || archetype) === "administracion" ? ["accesos.ver", "accesos.gestionar"] : []} onChange={setSelectedPermissions} />}
          </ModalBody>
          <ModalFooter><Button variant="light" onPress={() => setEditor(null)}>Cancelar</Button><Button color="primary" isLoading={saving} isDisabled={!canManage || name.trim().length < 2} onPress={saveEditor}>Guardar</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
