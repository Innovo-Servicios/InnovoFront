"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Upload } from "lucide-react";
import TablaWorkers from "@/components/Workers/TablaWorkers";
import { FormularioTrabajador } from "@/components/Workers/FormularioTrabajador";
import BulkPersonalDocumentUploadModal from "@/components/Documents/BulkPersonalDocumentUploadModal";
import layoutStyles from "@/styles/panelLayout.module.css";
import { Can } from "@/components/access/Can";

export default function Admin_Workers() {
  const [bulkDocumentOpen, setBulkDocumentOpen] = useState(false);

  return (
    <div className={layoutStyles.pageShell}>
      <div className={layoutStyles.mainPanel}>
        <div className={`${layoutStyles.panelToolbar} pt-4`}>
          <div />
          <Can permission="trabajadores.documentos.gestionar">
            <Button
              color="primary"
              variant="flat"
              startContent={<Upload size={18} />}
              onPress={() => setBulkDocumentOpen(true)}
            >
              Subir documento a todos
            </Button>
          </Can>
        </div>
        <TablaWorkers />
      </div>

      <Can permission="trabajadores.crear"><div className={layoutStyles.sidePanel}>
        <div className={layoutStyles.sideContent}>
          <FormularioTrabajador />
        </div>
      </div></Can>

      <BulkPersonalDocumentUploadModal
        isOpen={bulkDocumentOpen}
        onClose={() => setBulkDocumentOpen(false)}
      />
    </div>
  );
}
