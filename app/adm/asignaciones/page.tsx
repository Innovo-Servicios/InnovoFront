"use client";


import layoutStyles from "@/styles/panelLayout.module.css";
import AssignmentCreator from "@/components/Asignaciones/AssignmentCreator";
import AsignacionesSidePanel from "@/components/Asignaciones/AsignacionesSidePanel";

export default function AsignacionesPage() {
  return (
    <div className={layoutStyles.pageShell}>
      <section className={layoutStyles.mainPanel}>
        <AssignmentCreator />
      </section>

      <aside className={layoutStyles.sidePanel}>
        <div className={layoutStyles.sideContent}>
          <AsignacionesSidePanel />
        </div>
      </aside>
    </div>
  );
}
