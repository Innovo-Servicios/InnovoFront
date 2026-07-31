"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "@/styles/layout.module.css";
import {
  LayoutDashboard,
  Users,
  Map,
  MapPinned,
  BellPlus,
  LogOut,
  UserRoundSearch,
  MessageSquare,
  ClipboardList,
  ShieldCheck,
  KeyRound,
  LockKeyhole,
  Files,
} from "lucide-react";
import { Tooltip } from "@heroui/tooltip";
import Link from "next/link";
import { useAuth } from "../AuthContext";
import { ADMIN_ROUTE_PERMISSIONS, permissionForPath } from "@/lib/accessControl";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
const navItems = [
  { href: "/adm", icon: LayoutDashboard, label: "Panel de administración", permission: "panel.ver" },
  { href: "/adm/asignaciones", icon: ClipboardList, label: "Asignaciones", permission: "asignaciones.ver" },
  { href: "/adm/workers", icon: Users, label: "Trabajadores", permission: "trabajadores.ver" },
  { href: "/adm/followup", icon: UserRoundSearch, label: "Seguimiento", permission: "seguimiento.ver" },
  { href: "/adm/notification", icon: BellPlus, label: "Notificaciones", permission: "notificaciones.ver" },
  { href: "/adm/documentos", icon: Files, label: "Documentos empresariales", permission: "documentos_empresa.ver" },
  { href: "/adm/novedades", icon: MessageSquare, label: "Novedades", permission: "novedades.ver" },
  { href: "/adm/verificaciones", icon: ShieldCheck, label: "Validaciones terreno", permission: "validaciones_terreno.ver" },
  { href: "/adm/rutas", icon: Map, label: "Rutas", permission: "rutas.ver" },
  { href: "/adm/direcciones", icon: MapPinned, label: "Direcciones", permission: "direcciones.ver" },
  { href: "/adm/roles", icon: KeyRound, label: "Roles y permisos", permission: "accesos.ver" },
];
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, token, authReady, accessReady, hasPermission } = useAuth();
  const isActive = (path: string) => pathname === path;
  const requiredPermission = permissionForPath(pathname);
  const canAccessCurrentPath = !requiredPermission || hasPermission(requiredPermission);
  const visibleNavItems = navItems.filter(({ permission }) => hasPermission(permission));

  useEffect(() => {
    if (!authReady || !accessReady) return;
    if (!token) {
      router.replace("/");
      return;
    }
    if (pathname === "/adm" && !hasPermission("panel.ver")) {
      const firstAllowed = ADMIN_ROUTE_PERMISSIONS.find(
        ({ href, permission }) => href !== "/adm" && hasPermission(permission)
      );
      if (firstAllowed) router.replace(firstAllowed.href);
    }
  }, [accessReady, authReady, hasPermission, pathname, router, token]);

  if (!authReady || !accessReady) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Cargando acceso...</div>;
  }

  if (!canAccessCurrentPath) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto mb-4 text-danger" size={42} />
          <h1 className="text-2xl font-bold text-slate-900">Acceso restringido</h1>
          <p className="mt-2 text-slate-500">Tu rol no tiene permiso para abrir este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <div className={styles.navbar}>
        {visibleNavItems.map((item) => (
          <Tooltip key={item.href} content={item.label} placement="right">
            <Link
              href={item.href}
              className={`${styles.btn} ${
                isActive(item.href) ? "bg-gray-200" : ""
              }`}
            >
              <item.icon size={28} color={isActive(item.href) ? "#338CF1" : "black"}/>
            </Link>
          </Tooltip>
        ))}
        <Tooltip content="Cerrar sesión">
          <button
            onClick={() => {
              logout();
            }}
            className={`${styles.btn}`}
          >
            <LogOut size={28} color="black"/>
          </button>
        </Tooltip>
      </div>
      <section id="secctionadm">{children}</section>
    </div>
  );
}
