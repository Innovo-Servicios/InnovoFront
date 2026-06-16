import AsignacionesCalendarView from "@/components/Asignaciones/AsignacionesCalendarView";
import layoutStyles from "@/styles/panelLayout.module.css";

export default function AsignacionesCalendarioPage() {
  return (
    <div className={layoutStyles.pageShell}>
      <section className={layoutStyles.mainPanel}>
        <AsignacionesCalendarView />
      </section>
    </div>
  );
}
