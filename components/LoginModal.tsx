"use client";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { URL } from "../config/config";
import { useRouter } from "next/navigation";
import { useRut } from "react-rut-formatter";
import { useAuth } from "@/app/AuthContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { rut, updateRut, isValid } = useRut();

  const [password, setPassword] = useState("");
  const [rutTouched, setRutTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const router = useRouter();
  const { setToken } = useAuth();

  const toggleVisibility = () => setIsVisible((prev) => !prev);

  const rutHasValue = rut.formatted.trim().length > 0;
  const passwordHasValue = password.trim().length > 0;

  const showRutError =
    (rutTouched || submitted) && (!rutHasValue || !isValid);

  const showPasswordError =
    (passwordTouched || submitted) && !passwordHasValue;

  const resetForm = () => {
    updateRut("");
    setPassword("");
    setRutTouched(false);
    setPasswordTouched(false);
    setSubmitted(false);
    setIsVisible(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  
    console.log("Intentando login...");
    console.log("URL backend:", URL);
    console.log("Endpoint:", `${URL}/trabajador/login`);
    console.log("RUT raw:", rut.raw);
    console.log("RUT formatted:", rut.formatted);
    console.log("RUT válido:", isValid);
    console.log("Password existe:", password.length > 0);
  
    if (!rutHasValue || !isValid || !passwordHasValue) {
      console.log("Formulario inválido, no se envía request");
      return;
    }
  
    try {
      const dato = {
        rut: rut.raw,
        clave: password,
      };
    
      console.log("Payload enviado:", dato);
    
      const response = await fetch(`${URL}/trabajador/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dato),
      });
    
      console.log("Status:", response.status);
    
      if (response.ok) {
        const data = await response.json();
      
        console.log("Login correcto:", data);
      
        setToken(data.token);
        resetForm();
        onClose();
        router.push("/adm");
        return;
      }
    
      const errorText = await response.text();
      console.log("Respuesta error backend:", errorText);
      alert("Credenciales incorrectas");
    } catch (error) {
      console.error("Error de request:", error);
      alert("No se pudo conectar con el servidor. Revisa la URL del backend o CORS.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      placement="center"
      backdrop="blur"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Iniciar Sesión
        </ModalHeader>

        <ModalBody>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="RUT"
              placeholder="Ingrese su RUT"
              value={rut.formatted}
              onChange={(e) => {
                setRutTouched(true);
                updateRut(e.target.value);
              }}
              onBlur={() => setRutTouched(true)}
              isInvalid={showRutError}
              errorMessage={
                showRutError
                  ? !rutHasValue
                    ? "Debe ingresar su RUT."
                    : "Ingrese un RUT válido."
                  : ""
              }
              maxLength={12}
            />

            <Input
              label="Contraseña"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => {
                setPasswordTouched(true);
                setPassword(e.target.value);
              }}
              onBlur={() => setPasswordTouched(true)}
              isInvalid={showPasswordError}
              errorMessage={
                showPasswordError ? "Debe ingresar su contraseña." : ""
              }
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                >
                  {isVisible ? (
                    <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <Eye className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
              type={isVisible ? "text" : "password"}
            />

            <Button type="submit" color="primary" className="w-full">
              Ingresar
            </Button>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button color="danger" variant="light" onPress={handleClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
