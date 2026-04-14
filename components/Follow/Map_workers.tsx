import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/app/AuthContext"
import "leaflet/dist/leaflet.css"
import { divIcon } from "leaflet"
import { renderToString } from "react-dom/server"
import { CircleUserRound } from "lucide-react"
import CustomMarker from "../CustomMarker"
import { Card, CardBody, Button } from "@heroui/react"
import ConnectedWorkers from "./ConnectedWorkers"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"

function MapController({
  selectedWorker,
  workers,
  isFixed,
}: {
  selectedWorker: string | null
  workers: Record<string, { ubicacion: [number, number]; nombre: string }>
  isFixed: boolean
}) {
  const map = useMapEvents({})

  useEffect(() => {
    if (selectedWorker && workers[selectedWorker] && isFixed) {
      const { ubicacion } = workers[selectedWorker]
      map.setView(ubicacion, 22)
    }
  }, [selectedWorker, workers, map, isFixed])

  return null
}

export default function Map() {
  const { socket } = useAuth()
  const [workers, setWorkers] = useState<Record<string, { ubicacion: [number, number]; nombre: string }>>({})
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  const [isFixed, setIsFixed] = useState(true)

  const customIcon = useMemo(() => {

    return divIcon({
      html: renderToString(
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            backgroundColor: "rgba(66, 134, 244, 0.36)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              backgroundColor: "rgba(66, 134, 244, 0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircleUserRound
              style={{
                backgroundColor: "white",
                borderRadius: "50%",
                padding: "2px",
              }}
              size={32}
              color="#4285F4"
            />
          </div>
        </div>,
      ),
      className: "custom-marker",
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    })
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on("actualizarUbicacion", ({ id_trabajador, nombre, ubicacion }) => {
        console.log("📡 Recibida nueva ubicación:", id_trabajador, nombre, ubicacion)

        setWorkers((prev) => ({
          ...prev,
          [id_trabajador]: {
            ubicacion: [ubicacion.lat, ubicacion.lng],
            nombre,
          },
        }))
      })

      socket.on("trabajadorDesconectado", ({ id_trabajador }) => {
        console.log(`❌ Trabajador ${id_trabajador} desconectado, removiendo del mapa`)

        setWorkers((prev) => {
          const updatedWorkers = { ...prev }
          delete updatedWorkers[id_trabajador]
          return updatedWorkers
        })
      })

      return () => {
        socket.off("actualizarUbicacion")
        socket.off("trabajadorDesconectado")
      }
    }
  }, [socket])

  const handleWorkerSelect = (workerId: string | null) => {
    setSelectedWorker(workerId)
    setIsFixed(true)
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 0 }}>
      <Card className="absolute top-[20%] left-4 z-10 max-w-sm">
        <CardBody>
          <ConnectedWorkers workers={workers} onSelectWorker={handleWorkerSelect} selectedWorker={selectedWorker}/>
        </CardBody>
      </Card>
      <MapContainer center={[-33.0411, -71.6341]} zoom={13} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedWorker={selectedWorker} workers={workers} isFixed={isFixed} />
        {Object.entries(workers).map(([id, { ubicacion, nombre }]) =>
          ubicacion && ubicacion.length === 2 && customIcon ? (
            <CustomMarker
              key={id}
              position={[ubicacion[0], ubicacion[1]]}
              icon={customIcon}
              label={nombre}
              id={Number.parseInt(id)}
            />
          ) : null,
        )}
      </MapContainer>
    </div>
  )
}

