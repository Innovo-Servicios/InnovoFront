"use client";

import { MapContainer, TileLayer, Popup, Marker, useMapEvent, Polyline} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.label/dist/leaflet.label.css'; // Importa los estilos de Leaflet.Label
import { useState } from 'react';
import { LatLngTuple, LeafletEventHandlerFn } from 'leaflet';
import { sileo } from 'sileo';

interface CustomMarkerProps {
  position: LatLngTuple;
  number: number;
  draggable: boolean;
  eventHandlers: {
    dragend: LeafletEventHandlerFn;
    click: LeafletEventHandlerFn;
  };
}

const CustomMarker = ({ position, number, draggable, eventHandlers }: CustomMarkerProps) => {
  const icon = L.divIcon({
    className: 'custom-marker-icon',
    iconUrl: '../../public/iconos_svg/markerAdd.svg',
    html: `
          <div 
            class="custom-marker-label" 
            style="
              background-image:url('../iconos_svg/markerAdd.svg');
              background-size: cover;
              with: 100%;
              height: 100%;
            ">
          <p 
            style="
            font-size: 32px;
            color: red;
            ">${number}</p>
          </div>`,
    iconSize: [50, 50]
  });

  return (
    <Marker position={position} draggable={draggable} eventHandlers={eventHandlers} icon={icon}>
      <Popup>informacion del punto</Popup>
    </Marker>
  );
};

export default function Map() {
  const [markers, setMarkers] = useState<{ lat: number; lng: number; }[]>([]);
  const [center, setCenter] = useState<[number, number]>([-33.045022005412754, -71.42055173713028]);
  const [clearMap, setClearMap] = useState<boolean>(false);
  const addMarker = () => {
    setMarkers([...markers, { lat: center[0], lng: center[1] }]);
  };
  const ChangeView = () => {
    const map = useMapEvent('move', () => {
      const { lat, lng } = map.getCenter();
      setCenter([lat, lng]);
    });

    return null;
  };
  const handleMarkerDrag = (index: any, event: any) => {
    const { lat, lng } = event.target.getLatLng();
    const updatedMarkers = [...markers];
    updatedMarkers[index] = { lat, lng };
    setMarkers(updatedMarkers);
  };
  const deleteMarker = (index: any) => {
    if (clearMap){
      const updatedMarkers = [...markers];
      updatedMarkers.splice(index, 1);
      setMarkers(updatedMarkers);
    }
  };
  const changeState = () => {
    setClearMap(!clearMap);
    //agregar modificacion interactiva en el boton
  }
  const saveMarkers = () => {
    console.log(markers);
    sileo.success({
      title: 'Mapa guardado',
      description: `${markers.length} puntos quedaron preparados.`,
    });
  }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%'}} preferCanvas={false}>
        <ChangeView /> 
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={markers.map(marker => [marker.lat, marker.lng])} color="blue" />
        {markers.map((marker, index) => (
          <CustomMarker
          key={index}
          position={[marker.lat, marker.lng]}
          number={index + 1}
          draggable={true}
          eventHandlers={{
            dragend: (event) => handleMarkerDrag(index, event),
            click: () => deleteMarker(index)
          }}
        />
        ))}
      </MapContainer>
    </div>
  );
}
