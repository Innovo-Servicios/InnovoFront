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
import { URL as API_URL } from "@/config/config"

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

interface WorkerState {
  ubicacion: [number, number]
  nombre: string
  conectado: boolean
  ultimaActualizacion: string | null
}

interface WorkerLocationResponse {
  id_trabajador?: string
  nombre?: string
  ubicacion?: {
    lat?: number | string | null
    lng?: number | string | null
  }
  conectado?: boolean
  ultimaActualizacion?: string | null
}

const formatLastUpdate = (value: string | null) => {
  if (!value) return "Sin registro"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin registro"

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

const parseWorkerLocation = (worker: WorkerLocationResponse, connectedFallback: boolean) => {
  const id = String(worker.id_trabajador ?? "").trim()
  const rawLat = worker.ubicacion?.lat
  const rawLng = worker.ubicacion?.lng

  if (rawLat === null || rawLat === undefined || rawLat === "" || rawLng === null || rawLng === undefined || rawLng === "") {
    return null
  }

  const lat = Number(rawLat)
  const lng = Number(rawLng)

  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    id,
    worker: {
      ubicacion: [lat, lng] as [number, number],
      nombre: String(worker.nombre ?? "").trim() || id,
      conectado: worker.conectado ?? connectedFallback,
      ultimaActualizacion: worker.ultimaActualizacion ?? null,
    },
  }
}

function MapController({
  selectedWorker,
  workers,
  isFixed,
}: {
  selectedWorker: string | null
  workers: Record<string, WorkerState>
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
  const [workers, setWorkers] = useState<Record<string, WorkerState>>({})
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  const [isFixed, setIsFixed] = useState(true)
  const [ates, setAtes] = useState<AtePin[]>([])

  const fetchWorkerLocations = useCallback(() => {
    if (!token) return

    authenticatedFetch(`${API_URL}/trabajador/seguimientoUbicaciones`, {
      method: "GET",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("No se pudieron cargar las ubicaciones")
        }

        return res.json()
      })
      .then((data: WorkerLocationResponse[]) => {
        const nextWorkers: Record<string, WorkerState> = {}

        ;(Array.isArray(data) ? data : []).forEach((item) => {
          const parsed = parseWorkerLocation(item, false)
          if (parsed) {
            nextWorkers[parsed.id] = parsed.worker
          }
        })

        setWorkers(nextWorkers)
      })
      .catch(() => {})
  }, [authenticatedFetch, token])

  useEffect(() => {
    fetchWorkerLocations()
  }, [fetchWorkerLocations])

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

  const workerIcons = useMemo(() => {
    const buildWorkerIcon = (connected: boolean) => {
      const color = connected ? "#4285F4" : "#64748b"
      const backgroundColor = connected ? "rgba(66, 134, 244, 0.36)" : "rgba(100, 116, 139, 0.28)"
      const innerBackground = connected ? "rgba(66, 134, 244, 0.7)" : "rgba(100, 116, 139, 0.72)"

      return divIcon({
        html: renderToString(
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              backgroundColor,
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
                backgroundColor: innerBackground,
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
                color={color}
              />
            </div>
          </div>,
        ),
        className: connected ? "custom-marker worker-marker-connected" : "custom-marker worker-marker-disconnected",
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      })
    }

    return {
      connected: buildWorkerIcon(true),
      disconnected: buildWorkerIcon(false),
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    const upsertWorker = (payload: WorkerLocationResponse, connectedFallback: boolean) => {
      const parsed = parseWorkerLocation(payload, connectedFallback)
      if (!parsed) return

      setWorkers((prev) => ({
        ...prev,
        [parsed.id]: parsed.worker,
      }))
    }

    const handleLocationUpdate = (payload: WorkerLocationResponse) => {
      console.log("📡 Recibida nueva ubicación:", payload.id_trabajador, payload.nombre, payload.ubicacion)
      upsertWorker(payload, true)
    }

    const handleWorkerDisconnected = (payload: WorkerLocationResponse) => {
      console.log(`❌ Trabajador ${payload.id_trabajador} desconectado, manteniendo última ubicación`)
      upsertWorker({ ...payload, conectado: false }, false)
    }

    socket.on("actualizarUbicacion", handleLocationUpdate)
    socket.on("trabajadorDesconectado", handleWorkerDisconnected)

    return () => {
      socket.off("actualizarUbicacion", handleLocationUpdate)
      socket.off("trabajadorDesconectado", handleWorkerDisconnected)
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
        {Object.entries(workers).map(([id, { ubicacion, nombre, conectado, ultimaActualizacion }]) => {
          const workerIcon = conectado ? workerIcons.connected : workerIcons.disconnected

          return ubicacion && ubicacion.length === 2 && workerIcon ? (
            <CustomMarker
              key={id}
              position={[ubicacion[0], ubicacion[1]]}
              icon={workerIcon}
              label={nombre}
              id={Number.parseInt(id)}
            >
              <div style={{ minWidth: 170, fontSize: 13 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{nombre}</p>
                <span style={{
                  display: "inline-block", padding: "1px 8px",
                  borderRadius: 9999, fontSize: 11,
                  background: conectado ? "#dcfce7" : "#e2e8f0",
                  color: conectado ? "#16a34a" : "#475569",
                }}>
                  {conectado ? "Conectado" : "Última ubicación"}
                </span>
                <p style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
                  Última señal: {formatLastUpdate(ultimaActualizacion)}
                </p>
              </div>
            </CustomMarker>
          ) : null
        })}
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
