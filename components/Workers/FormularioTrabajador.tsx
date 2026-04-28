"use client";

import type React from "react";
import { useState } from "react";
import { Input, Select, SelectItem, Button } from "@heroui/react";
import {
  User,
  Mail,
  Lock,
  Briefcase,
  IdCard,
  Info,
  UserPlus,
} from "lucide-react";
import { useRut } from "react-rut-formatter";
import { crearTrabajador } from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";

type FormData = {
  Rut: string;
  Nombre: string;
  cargo: string;
  correo: string;
  clave: string;
};

type FormErrors = {
  [K in keyof FormData]?: string;
};

export function FormularioTrabajador() {
  const { rut, updateRut, isValid } = useRut();
  const { socket } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    Rut: "",
    Nombre: "",
    cargo: "",
    correo: "",
    clave: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [rutTouched, setRutTouched] = useState(false);

  const rutHasValue = rut.formatted.trim().length > 0;

  const showRutError =
    (rutTouched || submitted) && (!rutHasValue || !isValid);

  const resetForm = () => {
    updateRut("");
    setFormData({
      Rut: "",
      Nombre: "",
      cargo: "",
      correo: "",
      clave: "",
    });
    setErrors({});
    setSubmitted(false);
    setRutTouched(false);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!rutHasValue) {
      newErrors.Rut = "El RUT es obligatorio";
    } else if (!isValid) {
      newErrors.Rut = "Ingrese un RUT válido";
    }

    if (!formData.Nombre.trim()) {
      newErrors.Nombre = "El nombre es obligatorio";
    }

    if (
      !["administracion", "lector", "supervisor", "inspector"].includes(
        formData.cargo
      )
    ) {
      newErrors.cargo = "Seleccione un cargo válido";
    }

    if (!formData.correo.trim()) {
      newErrors.correo = "El correo electrónico es obligatorio";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        formData.correo
      )
    ) {
      newErrors.correo = "Ingrese un correo electrónico válido";
    }

    if (!formData.clave.trim()) {
      newErrors.clave = "La clave provisoria es obligatoria";
    } else if (formData.clave.length < 6) {
      newErrors.clave = "La clave debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (name: keyof FormData) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name as keyof FormData);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;

    setFormData((prev) => ({ ...prev, cargo: value }));
    clearFieldError("cargo");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateForm()) {
      return;
    }

    try {
      await crearTrabajador(
        rut.raw,
        formData.Nombre,
        formData.cargo,
        formData.correo,
        formData.clave
      );

      if (socket) {
        socket.emit("updateWorker");
      }

      resetForm();
    } catch (error) {
      console.error("Error al crear trabajador:", error);
      alert("No se pudo crear el trabajador. Intente nuevamente.");
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-5">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">
          Agregar Trabajador
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Completa los datos básicos del nuevo trabajador.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="form-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pr-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <IdCard size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Identificación
                </h2>
                <p className="text-xs text-slate-500">
                  Datos personales del trabajador.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                name="Rut"
                label="RUT"
                placeholder="Ingresa el RUT, ej: 12.345.678-9"
                value={rut.formatted}
                onChange={(e) => {
                  updateRut(e.target.value);
                  clearFieldError("Rut");
                }}
                onBlur={() => setRutTouched(true)}
                startContent={<User size={16} />}
                isInvalid={showRutError}
                errorMessage={showRutError ? errors.Rut : ""}
                maxLength={12}
                variant="bordered"
              />

              <Input
                name="Nombre"
                label="Nombre"
                placeholder="Ingresa el nombre completo"
                value={formData.Nombre}
                onChange={handleInputChange}
                startContent={<User size={16} />}
                isInvalid={!!errors.Nombre}
                errorMessage={errors.Nombre}
                variant="bordered"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Briefcase size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Información laboral
                </h2>
                <p className="text-xs text-slate-500">
                  Cargo y acceso inicial al sistema.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                label="Cargo"
                placeholder="Selecciona un cargo"
                selectedKeys={formData.cargo ? [formData.cargo] : []}
                onChange={handleSelectChange}
                isInvalid={!!errors.cargo}
                errorMessage={errors.cargo}
                variant="bordered"
              >
                <SelectItem key="administracion">Administración</SelectItem>
                <SelectItem key="lector">Lector</SelectItem>
                <SelectItem key="supervisor">Supervisor</SelectItem>
                <SelectItem key="inspector">Inspector</SelectItem>
              </Select>

              <Input
                name="correo"
                type="email"
                label="Correo electrónico"
                placeholder="Ingresa el correo electrónico"
                value={formData.correo}
                onChange={handleInputChange}
                startContent={<Mail size={16} />}
                isInvalid={!!errors.correo}
                errorMessage={errors.correo}
                variant="bordered"
              />

              <Input
                name="clave"
                type="password"
                label="Clave provisoria"
                placeholder="Ingresa la clave provisoria"
                value={formData.clave}
                onChange={handleInputChange}
                startContent={<Lock size={16} />}
                isInvalid={!!errors.clave}
                errorMessage={errors.clave}
                variant="bordered"
              />

              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                <Info size={18} className="mt-0.5 flex-shrink-0" />
                <p>
                  La clave provisoria podrá ser cambiada por el trabajador al
                  iniciar sesión.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white pt-4">
          <Button
            type="submit"
            color="primary"
            size="lg"
            className="w-full font-semibold shadow-sm"
            startContent={<UserPlus size={20} />}
          >
            Agregar trabajador
          </Button>
        </div>
      </form>
    </div>
  );  
} 