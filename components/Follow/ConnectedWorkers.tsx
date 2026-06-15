import { Avatar, Badge, Chip, ScrollShadow, Button } from "@heroui/react";
import { User, Wifi, WifiOff } from "lucide-react";

interface Worker {
  nombre: string;
  ubicacion: [number, number];
  conectado: boolean;
  ultimaActualizacion: string | null;
}

interface ConnectedWorkersProps {
  workers: Record<string, Worker>;
  onSelectWorker: (workerId: string | null) => void;
  selectedWorker: string | null;
  fix?: boolean;
}

export default function ConnectedWorkers({
  workers,
  onSelectWorker,
  selectedWorker,
}: ConnectedWorkersProps) {
  const workerEntries = Object.entries(workers).sort(([, a], [, b]) => {
    if (a.conectado !== b.conectado) {
      return a.conectado ? -1 : 1;
    }

    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });
  const workerCount = workerEntries.length;
  const connectedCount = workerEntries.filter(([, worker]) => worker.conectado).length;
  const selectedWorkerData = selectedWorker ? workers[selectedWorker] : null;

  const formatLastUpdate = (value: string | null) => {
    if (!value) return "Sin registro";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin registro";

    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const handleWorkerClick = (id: string) => {
    if (selectedWorker === id) {
      onSelectWorker(null); // Deseleccionar si ya está seleccionado
    } else {
      onSelectWorker(id); // Seleccionar nuevo trabajador
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-row gap-4">
        <h2 className="text-xl font-bold mb-2">Seguimiento</h2>
        <Chip color="success" variant="flat" className="mb-4">
          {connectedCount}/{workerCount}
        </Chip>
      </div>

      {selectedWorkerData && (
        <Chip color="warning" variant="flat" className="mb-4">
          Fijado en {selectedWorkerData.nombre}
        </Chip>
      )}

      <ScrollShadow
        className="max-h-[450px] min-h-[0px] overflow-y-auto"
        hideScrollBar
      >
        <ul className="space-y-2">
          {workerEntries.map(([id, { nombre, conectado, ultimaActualizacion }]) => (
            <li key={id} className="flex items-center space-x-2">
              <Button
                onPress={() => handleWorkerClick(id)}
                className={`w-full min-h-[72px] py-3 justify-start ${
                  selectedWorker === id ? "bg-blue-100" : ""
                }`}
                variant="light"
              >
                <Badge content="" color={conectado ? "success" : "default"} placement="bottom-right">
                  <Avatar
                    icon={<User size={24} />}
                    classNames={{
                      base: conectado
                        ? "bg-gradient-to-br from-[#4285F4] to-[#34A853]"
                        : "bg-slate-400",
                      icon: "text-white/90",
                    }}
                  />
                </Badge>
                <span className="ml-2 flex min-w-0 flex-col items-start">
                  <span className="max-w-[220px] truncate text-left">{nombre}</span>
                  <span className="flex items-center gap-1 text-xs text-default-500">
                    {conectado ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {conectado ? "Conectado" : `Última señal: ${formatLastUpdate(ultimaActualizacion)}`}
                  </span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </ScrollShadow>
    </div>
  );
}
