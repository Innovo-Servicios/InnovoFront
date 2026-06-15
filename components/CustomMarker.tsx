"use client";
import type { DivIcon, LatLng } from "leaflet";
import dynamic from 'next/dynamic';
const PopupWithNoSSR = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MarkerWithNoSSR = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
interface CustomMarkerProps {
  id: number;
  position: [number, number];
  icon: DivIcon;
  label: string;
  draggable?: boolean;
  onDragEnd?: (id: number, lat: number, lng: number) => void;
  children?: React.ReactNode;
}

const CustomMarker: React.FC<CustomMarkerProps> = ({
  id,
  position,
  icon,
  label,
  draggable = false,
  onDragEnd,
  children,
}) => {
  const handleDragEnd = (e: { target: { getLatLng: () => LatLng } }) => {
    if (onDragEnd) {
      const { lat, lng } = e.target.getLatLng();
      onDragEnd(id, lat, lng);
    }
  };

  return (
    <MarkerWithNoSSR
      position={position}
      icon={icon}
      draggable={draggable}
      eventHandlers={{ dragend: handleDragEnd }}
    >
      <PopupWithNoSSR>{children ?? label}</PopupWithNoSSR>
    </MarkerWithNoSSR>
  );
};

export default CustomMarker;
