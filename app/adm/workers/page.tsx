"use client";

import TablaWorkers from "@/components/Workers/TablaWorkers";
import { FormularioTrabajador } from "@/components/Workers/FormularioTrabajador";
import layoutStyles from "@/styles/panelLayout.module.css";

export default function Admin_Workers() {
  return (
    <div className={layoutStyles.pageShell}>
      <div className={layoutStyles.mainPanel}>
        <TablaWorkers />
      </div>

      <div className={layoutStyles.sidePanel}>
        <div className={layoutStyles.sideContent}>
          <FormularioTrabajador />
        </div>
      </div>
    </div>
  );
}