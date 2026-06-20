"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/sectores.module.css";
import "leaflet/dist/leaflet.css";
import Tab_Direccion from "@/components/Direccion/Tab_Direccion";
import {
  useDireccion,
  type Direccion,
} from "@/app/adm/direcciones/DireccionProvider";
import { Menu, MapPin } from "lucide-react";
import { divIcon } from "leaflet";
import { renderToString } from "react-dom/server";
import { sileo } from "sileo";
import { useAuth } from "@/app/AuthContext";
import Tab_Cluester from "./Tab_Cluster";
// Dynamically import react-leaflet components
const MapContainerWithNoSSR = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayerWithNoSSR = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const MarkerClusterGroupWithNoSSR = dynamic(
  () => import("react-leaflet-cluster"),
  { ssr: false }
);
const CustomMarker = dynamic(() => import("../CustomMarker"), { ssr: false });
interface Cluster {
  id: number;
  direccion: string;
  lat: number;
  lng: number;
}
export default function Map_Direccion() {
  const [isClient, setIsClient] = useState(false);
  const [markers, setMarkers] = useState<Direccion[]>([]);
  const [center, setCenter] = useState<[number, number]>([
    -33.045022005412754, -71.42055173713028,
  ]);
  const { direcciones } = useDireccion();
  const [isOpen, setIsOpen] = useState(true);
  const [clusterSelected, setClusterSelected] = useState<Cluster[]>([]);
  const { socket } = useAuth();
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (direcciones && direcciones.length > 0) {
      // Filtra direcciones con LAT y LNG válidos
      const validDirecciones = direcciones.filter(
        (d) =>
          typeof d.LAT === "number" &&
          typeof d.LNG === "number" &&
          !isNaN(d.LAT) &&
          !isNaN(d.LNG)
      );
      // Encuentra direcciones inválidas
      const invalidDirecciones = direcciones.filter(
        (d) =>
          typeof d.LAT !== "number" ||
          typeof d.LNG !== "number" ||
          isNaN(d.LAT) ||
          isNaN(d.LNG)
      );
      if (invalidDirecciones.length > 0) {
        const nombres = invalidDirecciones
          .map((d) => d.calle || d._id || "Sin nombre")
          .join(", ");
        sileo.warning({
          title: `${invalidDirecciones.length} direcciones sin coordenadas válidas`,
          description: nombres,
        });
      }
      setMarkers(validDirecciones);
      setIsOpen(false);
    }
  }, [direcciones]);
  useEffect(() => {
    if (socket) {
      socket.on("direccionActualizada", (updatedDireccion) => {
        setMarkers((prevMarkers) =>
          prevMarkers.map((marker) =>
            marker._id === updatedDireccion.id
              ? {
                  ...marker,
                  lat: updatedDireccion.lat,
                  lng: updatedDireccion.lng,
                }
              : marker
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off("direccionActualizada");
      }
    };
  }, [socket]);
  const customIcon = useMemo(
    () =>
      divIcon({
        html: renderToString(<MapPin size={32} color="#FF0000" fill="white" />),
        className: "",
        iconSize: [32, 32],
        iconAnchor: [24, 32],
      }),
    []
  );

  if (!isClient) {
    return null;
  }
  const updateDireccion = (id: number, lat: number, lng: number) => {
    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) =>
        marker._id === id ? { ...marker, LAT: lat, LNG: lng } : marker
      )
    );
    if (socket) {
      socket.emit("actualizarDireccion", {
        id: id,
        lat,
        lng,
      });
    }
  };
  const handleClusterClick = (cluster: {
    layer: { getAllChildMarkers: () => any };
  }) => {
    const markersInCluster = cluster.layer.getAllChildMarkers();
    let idCounter = 1;
    const selectedClusters: Cluster[] = markersInCluster.map((marker: any) => ({
      id: idCounter++,
      direccion: marker.options.children.props.children || "Sin nombre",
      lat: marker.getLatLng().lat,
      lng: marker.getLatLng().lng,
    }));
    setClusterSelected(selectedClusters);
  };
  return (
    <div className={styles.AdminDiv}>
      {isOpen ? (
        <div className={styles.overlayContainer}>
          <Tab_Direccion />
        </div>
      ) : (
        <button
          style={{
            position: "absolute",
            top: "10%",
            left: "3.3%",
            zIndex: 1000,
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "10px",
            boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.6)",
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu />
        </button>
      )}
      {clusterSelected.length > 0 && (
        <div className={styles.overlayContainerCluster}>
          <Tab_Cluester cluster={clusterSelected} />
        </div>
      )}
      <MapContainerWithNoSSR
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        preferCanvas={true}
      >
        <TileLayerWithNoSSR
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroupWithNoSSR
          chunkedLoading
          onContextMenu={handleClusterClick}
        >
          {markers.map((marker) => (
            <CustomMarker
              key={marker._id}
              id={marker._id}
              position={[marker.LAT, marker.LNG]}
              icon={customIcon}
              label={marker.calle || "Sin nombre"}
              draggable={true}
              onDragEnd={(id, lat, lng) => {
                updateDireccion(id, lat, lng);
              }}
            />
          ))}
        </MarkerClusterGroupWithNoSSR>
      </MapContainerWithNoSSR>
    </div>
  );
}
