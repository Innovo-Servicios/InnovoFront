import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/app/AuthContext"
import "leaflet/dist/leaflet.css"
import { divIcon } from "leaflet"
import { renderToString } from "react-dom/server"
import { CircleUserRound, MapPin } from "lucide-react"
import CustomMarker from "../CustomMarker"
import { Card, CardBody } from "@heroui/react"
import ConnectedWorkers from "./ConnectedWorkers"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import { getATEsAdm } from "@/api/adm/api"

interface AtePin {
  id: string
  lat: number
  lng: number
  calle: string
  comentario: string
  trabajador: string | null
  tipo: string | null
  estado: boolean
}

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
  const { socket, token, authenticatedFetch } = useAuth()
  const [workers, setWorkers] = useState<Record<string, { ubicacion: [number, number]; nombre: string }>>({})
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  const [isFixed, setIsFixed] = useState(true)
  const [ates, setAtes] = useState<AtePin[]>([])

  const fetchAtes = useCallback(() => {
    if (!token) return
    const today = new Date().toISOString().slice(0, 10)
    getATEsAdm(token, today, today, authenticatedFetch)
      .then((res) => res.json())
      .then((data) => {
        const pins: AtePin[] = (data.ate ?? [])
          .filter((a: any) => a.direccion?.lat && a.direccion?.lng)
          .map((a: any) => ({
            id: String(a.id),
            lat: a.direccion.lat,
            lng: a.direccion.lng,
            calle: a.direccion.nombre ?? "",
            comentario: a.comentario ?? "",
            trabajador: a.Trabajador?.nombre ?? null,
            tipo: a.tipo?.nombre ?? null,
            estado: a.estado,
          }))
        setAtes(pins)
      })
      .catch(() => {})
  }, [authenticatedFetch, token])

  useEffect(() => {
    fetchAtes()
  }, [fetchAtes])

  const ateIcons = useMemo(() => {
    const buildAteIcon = (isAnswered: boolean) => {
      const color = isAnswered ? "#16a34a" : "#dc2626"
      const backgroundColor = isAnswered ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"
      const fill = isAnswered ? "rgba(22,163,74,0.7)" : "rgba(220,38,38,0.7)"

      return divIcon({
        html: renderToString(
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor,
            display: "flex", justifyContent: "center", alignItems: "center",
          }}>
            <MapPin size={22} color={color} fill={fill} />
          </div>
        ),
        className: isAnswered ? "ate-marker ate-marker-answered" : "ate-marker ate-marker-pending",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })
    }

    return {
      answered: buildAteIcon(true),
      pending: buildAteIcon(false),
    }
  }, [])

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

  useEffect(() => {
    if (!socket) return

    socket.on("nuevaAte", fetchAtes)

    return () => {
      socket.off("nuevaAte", fetchAtes)
    }
  }, [fetchAtes, socket])

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
        {ates.map((ate) => {
          const ateIcon = ate.estado ? ateIcons.answered : ateIcons.pending

          return ateIcon ? (
            <CustomMarker
              key={ate.id}
              position={[ate.lat, ate.lng]}
              icon={ateIcon}
              label={ate.calle}
              id={0}
            >
              <div style={{ minWidth: 180, fontSize: 13 }}>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>{ate.calle}</p>
                {ate.trabajador && <p style={{ color: "#475569" }}>{ate.trabajador}</p>}
                {ate.tipo && <p style={{ color: "#64748b", fontSize: 11 }}>{ate.tipo}</p>}
                {ate.comentario && <p style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>{ate.comentario}</p>}
                <span style={{
                  display: "inline-block", marginTop: 6, padding: "1px 8px",
                  borderRadius: 9999, fontSize: 11,
                  background: ate.estado ? "#dcfce7" : "#fee2e2",
                  color: ate.estado ? "#16a34a" : "#dc2626",
                }}>
                  {ate.estado ? "Respondida" : "Pendiente"}
                </span>
              </div>
            </CustomMarker>
          ) : null
        })}
      </MapContainer>
    </div>
  )
}
