"use client";

import { useState } from "react";
import NotificationTable from "@/components/Notification/NotificationTable";
import NotificationADD from "@/components/Notification/NotificationADD";
import NotificationModal from "@/components/Notification/NotificationModal";
import layoutStyles from "@/styles/panelLayout.module.css";

export default function Admin_Notification() {
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (notification: any) => {
    console.log(notification);
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  return (
    <div className={layoutStyles.pageShell}>
      {selectedNotification && (
        <NotificationModal
          isOpen={isModalOpen}
          notification={selectedNotification}
          onClose={handleCloseModal}
        />
      )}

      <div className={layoutStyles.mainPanel}>
        <NotificationTable onRowClick={handleRowClick} />
      </div>

      <div className={layoutStyles.sidePanel}>
        <div className={layoutStyles.sideContent}>
          <NotificationADD />
        </div>
      </div>
    </div>
  );
}