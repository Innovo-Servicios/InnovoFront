"use client";

import layoutStyles from "@/styles/panelLayout.module.css";
import AssignmentCreator from "@/components/Asignaciones/AssignmentCreator";
import AsignacionesSidePanel from "@/components/Asignaciones/AsignacionesSidePanel";
import { Can } from "@/components/access/Can";

export default function AsignacionesPage() {
  return (
    <div className={layoutStyles.pageShell}>
      <Can permission="asignaciones.crear" fallback={<section className={`${layoutStyles.mainPanel} grid place-items-center text-slate-500`}>Tu rol permite consultar asignaciones, pero no crear o configurarlas.</section>}><section className={layoutStyles.mainPanel}>
        <AssignmentCreator />
      </section></Can>

      <aside className={layoutStyles.sidePanel}>
        <div className={layoutStyles.sideContent}>
          <AsignacionesSidePanel />
        </div>
      </aside>
    </div>
  );
}
