import React, { use, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
  Select,
  SelectItem,
  Chip,
  Button,
} from "@heroui/react";
import {
  Bell,
  User,
  Briefcase,
  UserCog,
  Mail,
  Image,
  FileText,
  File
} from "lucide-react";
import { useEffect } from "react";
import { URL } from "@/config/config";
import { useAuth } from "@/app/AuthContext";
interface Worker {
  Rut: string;
  Nombre: string;
  cargo: "administracion" | "lector" | "supervisor" | "inspector";
  apoyo?: string;
  correo: string;
  notificaciones: Notification[];
  documentos?: Document[];
  rol?: Rol;
  rolTemporal?: {
    rol: string;
    expiracion: Date;
  };
}
interface Document {
  _id: string;
  tipo: {_id: string, value: string};
  formato: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/jpg'|"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
interface Notification {
  _id: string;
  titulo: string;
  tipo: {_id: string, value: "alert" | "document"};
  estado: "pendiente" | "visto";
  fecha?: Date;
}
interface Rol {
  _id: string;
  nombre: string;
}
interface WorkerModalProps {
  isOpen: boolean;
  rut: string;
  onClose: () => void;
}

export default function WorkerModal({
  isOpen,
  rut,
  onClose,
}: WorkerModalProps) {
  if (!Worker) return null;
  const [worker, setWorker] = useState<Worker | null>(null);
  const [nombre, setNombre] = useState<string>("");
  const [correo, setCorreo] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [Mod,setMod] = useState<boolean>(false);
  const { token, socket, authenticatedFetch } = useAuth();
  const fetchWorkerDetails = async () => {
    const data = {
      token: token,
      rut: rut,
    };
    try {
      const response = await authenticatedFetch(`${URL}/trabajador/obtenerTrabajador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const res = await response.json();
      setWorker(res);
      setNombre(res.Nombre);
      setCorreo(res.correo);
    } catch (error) {
      console.error("Error fetching workers details:", error);
    }
  };
  useEffect(() => {
    if (token) {
      fetchWorkerDetails();
    }
  }, [token]);
  const handlerMod = async () => {
    if(Mod){
      const data = {
        token,
        rut,
        Nuevonombre: nombre,
        Nuevocorreo: correo,
      };
      const response = await authenticatedFetch(`${URL}/trabajador/modificardatostrabajador`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if(response.ok){
        alert("Datos modificados correctamente");
        setMod(!Mod);
        if(socket){
          socket.emit("updateWorker");
        }
      }
      else{
        alert("Error al modificar los datos del trabajador");
        console.error("Error al modificar los datos del trabajador");
      }
    }else{
      setMod(!Mod);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" backdrop="blur">
      {worker && (
        <ModalContent>
            <ModalHeader className="flex justify-between items-center px-10">
            <h1 className="flex-grow text-center">{worker.Nombre}</h1>
            <Button variant="flat" size="md" color={Mod ? "success" : "warning"} className="ml-auto" onPress={handlerMod}>{Mod ? "Guardar" : "Modificar"}</Button>
            </ModalHeader>
          <ModalBody>
            <div className="space-y-4 p-8">
              <Input
                label="RUT"
                value={rut}
                readOnly
                isDisabled
                startContent={
                  <User className="text-default-400 pointer-events-none flex-shrink-0" />
                }
              />
              <Input
                label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                isDisabled={!Mod}
                startContent={
                  <User className="text-default-400 pointer-events-none flex-shrink-0" />
                }
              />
              <Input
                label="Email"
                value={correo}
                isDisabled={!Mod}
                onChange={(e) => setCorreo(e.target.value)}
                startContent={
                  <Mail className="text-default-400 pointer-events-none flex-shrink-0" />
                }
              />
              <Select
                label="Cargo"
                defaultSelectedKeys={[worker.cargo]}
                isDisabled={!Mod}
                startContent={
                  <Briefcase className="text-default-400 pointer-events-none flex-shrink-0" />
                }
                onChange={(e) => setCargo(e.target.value)}
              >
                <SelectItem key="administracion">Administración</SelectItem>
                <SelectItem key="lector">Lector</SelectItem>
                <SelectItem key="supervisor">Supervisor</SelectItem>
                <SelectItem key="inspector">Inspector</SelectItem>
              </Select>
              {worker.apoyo && (
                <Input
                  label="Support"
                  value={worker.apoyo}
                  readOnly
                  startContent={
                    <UserCog className="text-default-400 pointer-events-none flex-shrink-0" />
                  }
                />
              )}
            </div>
          </ModalBody>
        </ModalContent>
      )}
    </Modal>
  );
}
