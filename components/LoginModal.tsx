'use client'

import React, { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react"
import { Eye, EyeOff } from 'lucide-react'
import {URL} from '../config/config'
import { useRouter } from "next/navigation";
import { useRut } from "react-rut-formatter";
import { useAuth } from "@/app/AuthContext";
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { rut, updateRut, isValid } = useRut();
  const [password, setPassword] = useState('')
  const toggleVisibility = () => setIsVisible(!isVisible)
  const router = useRouter();
  const { setToken } = useAuth();
const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const dato = { rut: rut.raw, clave: password }
        const response = await fetch(`${URL}/trabajador/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(dato),
        });
        if (response.ok) {
            const data = await response.json();
            setToken(data.token);
            router.push("/adm");
        } else {
            alert("Credenciales incorrectas");
        }
    } catch (error) {
        // Maneja errores de red o de servidor
        console.error("Error de request", error);
        alert("Se produjo un error. Intente de nuevo más tarde");
    }
}

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      placement="center"
      backdrop="blur"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">Iniciar Sesión</ModalHeader>
        <ModalBody>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="RUT"
              placeholder="Ingrese su RUT"
              value={rut.formatted}
              onChange={(e) => updateRut(e.target.value)}
              required
              isInvalid={!isValid}
              maxLength={12}
            />
            <Input
              label="Contraseña"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endContent={
                <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                  {isVisible ? (
                    <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <Eye className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
              type={isVisible ? "text" : "password"}
              required
            />
            <Button type="submit" color="primary" className="w-full">
              Ingresar
            </Button>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
