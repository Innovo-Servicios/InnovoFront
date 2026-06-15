"use client";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { Tooltip } from "@heroui/tooltip";
import Link from "next/link";
import { useAuth } from "../AuthContext";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
const navItems = [
  { href: "/adm", icon: LayoutDashboard, label: "Panel de administración" },
  { href: "/adm/asignaciones", icon: ClipboardList, label: "Asignaciones" },
  { href: "/adm/workers", icon: Users, label: "Trabajadores" },
  { href: "/adm/followup", icon: UserRoundSearch, label: "Seguimiento" },
  { href: "/adm/notification", icon: BellPlus, label: "Notificaciones" },
  { href: "/adm/novedades", icon: MessageSquare, label: "Novedades" },
  { href: "/adm/verificaciones", icon: ShieldCheck, label: "Validaciones terreno" },
  { href: "/adm/rutas", icon: Map, label: "Rutas" },
  { href: "/adm/direcciones", icon: MapPinned, label: "Direcciones" },
];
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const isActive = (path: string) => pathname === path;
  return (
    <div className={styles.body}>
      <div className={styles.navbar}>
        {navItems.map((item) => (
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
