"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Input, Select, SelectItem, Button } from "@heroui/react";
import {
  User,
  Mail,
  Briefcase,
  IdCard,
  Info,
  UserPlus,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useRut } from "react-rut-formatter";
import { sileo } from "sileo";
import { crearTrabajador } from "@/api/adm/api";
import { useAuth } from "@/app/AuthContext";
import { URL } from "@/config/config";

type FormData = {
  Rut: string;
  Nombre: string;
  cargo: string;
  correo: string;
  clave: string;
};

type FormErrors = {
  [K in keyof FormData]?: string;
} & {
  general?: string;
};

type Worker = {
  _id?: string;
  Rut: string;
  Nombre: string;
  cargo: string;
  correo: string;
};

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 24;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/;

export function FormularioTrabajador() {
  const { rut, updateRut, isValid } = useRut();
  const { token, socket, authenticatedFetch } = useAuth();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const rutHasValue = rut.formatted.trim().length > 0;

  const normalizeRut = (value: string) => {
    return value.replace(/\./g, "").replace(/\s/g, "").toLowerCase();
  };

  const normalizeEmail = (value: string) => {
    return value.trim().toLowerCase();
  };

  const generatedPassword = useMemo(() => {
    if (!rut.raw) return "";

    const cleanRut = normalizeRut(rut.raw).replace("-", "");
    const rutBody = cleanRut.slice(0, -1);
    const rutDv = cleanRut.slice(-1).toUpperCase();

    if (!rutBody || !rutDv) return "";

    return `Inn-${rutBody}-${rutDv}`;
  }, [rut.raw]);

  const passwordValidation = useMemo(() => {
    const validations = {
      minLength: generatedPassword.length >= PASSWORD_MIN_LENGTH,
      maxLength: generatedPassword.length <= PASSWORD_MAX_LENGTH,
      hasUppercase: /[A-Z]/.test(generatedPassword),
      hasNumber: /\d/.test(generatedPassword),
      hasPrefix: generatedPassword.startsWith("Inn-"),
    };

    return {
      validations,
      isPasswordValid: Object.values(validations).every(Boolean),
    };
  }, [generatedPassword]);

  const isRutDuplicated = useMemo(() => {
    if (!rut.raw) return false;

    const currentRut = normalizeRut(rut.raw);

    return workers.some((worker) => normalizeRut(worker.Rut) === currentRut);
  }, [rut.raw, workers]);

  const isEmailDuplicated = useMemo(() => {
    if (!formData.correo.trim()) return false;

    const currentEmail = normalizeEmail(formData.correo);

    return workers.some(
      (worker) => normalizeEmail(worker.correo || "") === currentEmail
    );
  }, [formData.correo, workers]);

  const validateName = (name: string): string | undefined => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return "El nombre es obligatorio";
    }

    if (trimmedName.length < 3) {
      return "El nombre debe tener al menos 3 caracteres";
    }

    if (!NAME_REGEX.test(trimmedName)) {
      return "El nombre solo puede contener letras, espacios, guiones o apóstrofes";
    }

    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return "El correo electrónico es obligatorio";
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return "Ingrese un correo válido. Ejemplo: nombre@correo.com";
    }

    if (isEmailDuplicated) {
      return "Este correo ya está registrado";
    }

    return undefined;
  };

  const getRutError = (): string | undefined => {
    if (!rutHasValue) {
      return "El RUT es obligatorio";
    }

    if (!isValid) {
      return "Ingrese un RUT válido";
    }

    if (isRutDuplicated) {
      return "Este RUT ya está registrado";
    }

    return undefined;
  };

  const currentNameError = validateName(formData.Nombre);
  const currentEmailError = validateEmail(formData.correo);
  const currentRutError = getRutError();

  const showRutError = (rutTouched || submitted) && !!currentRutError;

  const showNameError =
    formData.Nombre.trim().length > 0
      ? !!currentNameError
      : (nameTouched || submitted) && !!currentNameError;

  const showEmailError =
    formData.correo.trim().length > 0
      ? !!currentEmailError
      : (emailTouched || submitted) && !!currentEmailError;

  const fetchWorkers = async () => {
    if (!token) return;

    try {
      setIsLoadingWorkers(true);

      const response = await authenticatedFetch(`${URL}/trabajador/listarTrabajadores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });

      const json = await response.json();

      if (Array.isArray(json)) {
        setWorkers(json);
      }
    } catch (error) {
      console.error("Error al cargar trabajadores:", error);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleWorkerUpdate = () => {
      fetchWorkers();
    };

    socket.on("updateWorker", handleWorkerUpdate);
    socket.on("nuevo-trabajador", handleWorkerUpdate);

    return () => {
      socket.off("updateWorker", handleWorkerUpdate);
      socket.off("nuevo-trabajador", handleWorkerUpdate);
    };
  }, [socket, token]);

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
    setNameTouched(false);
    setEmailTouched(false);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const rutError = getRutError();
    const nameError = validateName(formData.Nombre);
    const emailError = validateEmail(formData.correo);

    if (rutError) {
      newErrors.Rut = rutError;
    }

    if (nameError) {
      newErrors.Nombre = nameError;
    }

    if (
      !["administracion", "lector", "supervisor", "inspector"].includes(
        formData.cargo
      )
    ) {
      newErrors.cargo = "Seleccione un cargo válido";
    }

    if (emailError) {
      newErrors.correo = emailError;
    }

    if (!generatedPassword) {
      newErrors.clave = "No se pudo generar la clave provisoria";
    } else if (!passwordValidation.isPasswordValid) {
      newErrors.clave =
        "La clave provisoria automática no cumple las reglas mínimas";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (name: keyof FormData) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      delete next.general;
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "Nombre") {
      const cleanedValue = value.replace(
        /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g,
        ""
      );

      setFormData((prev) => ({ ...prev, Nombre: cleanedValue }));
      clearFieldError("Nombre");
      return;
    }

    if (name === "correo") {
      const cleanedEmail = value.replace(/\s/g, "");

      setFormData((prev) => ({ ...prev, correo: cleanedEmail }));
      clearFieldError("correo");
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name as keyof FormData);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;

    setFormData((prev) => ({ ...prev, cargo: value }));
    clearFieldError("cargo");
  };

  const handleRutChange = (value: string) => {
    updateRut(value);
    clearFieldError("Rut");
  };

  const submitWorker = async () => {
    setSubmitted(true);
    setRutTouched(true);
    setNameTouched(true);
    setEmailTouched(true);

    if (!validateForm()) {
      return;
    }

    const createWorkerRequest = async () => {
      const response = await crearTrabajador(
        rut.raw,
        formData.Nombre.trim(),
        formData.cargo,
        formData.correo.trim(),
        generatedPassword,
        authenticatedFetch
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nuevoTrabajador = {
        Rut: rut.raw,
        Nombre: formData.Nombre.trim(),
        cargo: formData.cargo,
        correo: formData.correo.trim(),
      };

      setWorkers((prev) => {
        const alreadyExists = prev.some(
          (worker) =>
            normalizeRut(worker.Rut) === normalizeRut(nuevoTrabajador.Rut)
        );

        if (alreadyExists) return prev;

        return [...prev, nuevoTrabajador];
      });

      if (socket) {
        socket.emit("updateWorker");
        socket.emit("nuevo-trabajador", nuevoTrabajador);
      }

      window.dispatchEvent(new Event("workers:reload"));

      await fetchWorkers();
      resetForm();
      return nuevoTrabajador;
    };

    setIsSubmitting(true);
    try {
      await sileo.promise(createWorkerRequest(), {
        loading: {
          title: "Creando trabajador",
          description: "Estamos validando y guardando sus datos.",
        },
        success: (nuevoTrabajador) => ({
          title: "Trabajador creado",
          description: `${nuevoTrabajador.Nombre} quedó disponible en el listado.`,
        }),
        error: (error) => ({
          title: "No se pudo crear el trabajador",
          description:
            error instanceof Error
              ? error.message
              : "Revisa los datos e inténtalo nuevamente.",
        }),
      });
    } catch (error: any) {
      console.error("Error al crear trabajador:", error);

      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo crear el trabajador. Intente nuevamente.";

      if (
        backendMessage.toLowerCase().includes("rut") ||
        backendMessage.toLowerCase().includes("duplic")
      ) {
        setErrors({
          Rut: "Este RUT ya está registrado",
        });
        setRutTouched(true);
      } else if (
        backendMessage.toLowerCase().includes("correo") ||
        backendMessage.toLowerCase().includes("email")
      ) {
        setErrors({
          correo: "Este correo ya está registrado o no es válido",
        });
        setEmailTouched(true);
      } else if (
        backendMessage.toLowerCase().includes("unauthorized") ||
        backendMessage.toLowerCase().includes("401")
      ) {
        setErrors({
          general:
            "No tienes autorización para crear trabajadores. Vuelve a iniciar sesión.",
        });
      } else {
        setErrors({
          general: backendMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitWorker();
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
                onChange={(e) => handleRutChange(e.target.value)}
                onBlur={() => setRutTouched(true)}
                startContent={<User size={16} />}
                isInvalid={showRutError}
                errorMessage={showRutError ? currentRutError : ""}
                maxLength={12}
                variant="bordered"
                color={
                  rutHasValue && isValid && !isRutDuplicated
                    ? "success"
                    : undefined
                }
                endContent={
                  rutHasValue && isValid && !isRutDuplicated ? (
                    <CheckCircle2 size={18} className="text-success" />
                  ) : undefined
                }
              />

              {isRutDuplicated && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>
                    Este RUT ya existe en el sistema. No puedes registrar dos
                    trabajadores con el mismo RUT.
                  </p>
                </div>
              )}

              <Input
                name="Nombre"
                label="Nombre"
                placeholder="Ingresa el nombre completo"
                value={formData.Nombre}
                onChange={handleInputChange}
                onBlur={() => setNameTouched(true)}
                startContent={<User size={16} />}
                isInvalid={showNameError}
                errorMessage={showNameError ? currentNameError : ""}
                variant="bordered"
                maxLength={80}
              />

              <p className="text-xs text-slate-400">
                Solo se permiten letras, espacios, guiones y apóstrofes.
              </p>
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
                type="text"
                inputMode="email"
                label="Correo electrónico"
                placeholder="Ejemplo: trabajador@correo.com"
                value={formData.correo}
                onChange={handleInputChange}
                onBlur={() => setEmailTouched(true)}
                startContent={<Mail size={16} />}
                isInvalid={showEmailError}
                errorMessage={showEmailError ? currentEmailError : ""}
                variant="bordered"
                maxLength={100}
              />

              {isEmailDuplicated && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>
                    Este correo ya existe en el sistema. Usa otro correo para
                    registrar al trabajador.
                  </p>
                </div>
              )}

              <Input
                name="clave"
                type="text"
                label="Clave provisoria automática"
                placeholder="Se generará al ingresar el RUT"
                value={generatedPassword}
                startContent={
                  <KeyRound size={16} className="text-slate-400" />
                }
                isReadOnly
                isDisabled
                isInvalid={!!errors.clave}
                errorMessage={errors.clave}
                variant="bordered"
                classNames={{
                  inputWrapper:
                    "bg-slate-100 border-slate-300 opacity-100 cursor-not-allowed",
                  input: "text-slate-500 font-semibold cursor-not-allowed",
                  label: "text-slate-500",
                }}
              />

              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                <Info size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    La clave provisoria se genera automáticamente desde el RUT.
                  </p>
                  <p className="mt-1 text-xs">
                    Formato: <strong>Inn-RUT-DV</strong>. El trabajador podrá
                    cambiarla al iniciar sesión.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="mb-2 font-semibold text-slate-700">
                  Reglas de clave provisoria
                </p>

                <ul className="space-y-1">
                  <li
                    className={
                      passwordValidation.validations.minLength
                        ? "text-green-600"
                        : "text-slate-500"
                    }
                  >
                    • Mínimo {PASSWORD_MIN_LENGTH} caracteres
                  </li>

                  <li
                    className={
                      passwordValidation.validations.maxLength
                        ? "text-green-600"
                        : "text-slate-500"
                    }
                  >
                    • Máximo {PASSWORD_MAX_LENGTH} caracteres
                  </li>

                  <li
                    className={
                      passwordValidation.validations.hasUppercase
                        ? "text-green-600"
                        : "text-slate-500"
                    }
                  >
                    • Incluye mayúscula
                  </li>

                  <li
                    className={
                      passwordValidation.validations.hasNumber
                        ? "text-green-600"
                        : "text-slate-500"
                    }
                  >
                    • Incluye número
                  </li>

                  <li
                    className={
                      passwordValidation.validations.hasPrefix
                        ? "text-green-600"
                        : "text-slate-500"
                    }
                  >
                    • Usa prefijo institucional Inn-
                  </li>
                </ul>
              </div>

              {errors.general && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-600">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>{errors.general}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white pt-4">
          <Button
            type="button"
            color="primary"
            size="lg"
            className="w-full font-semibold shadow-sm"
            startContent={<UserPlus size={20} />}
            isLoading={isSubmitting}
            isDisabled={isSubmitting || isLoadingWorkers || isRutDuplicated}
            onPress={submitWorker}
          >
            Agregar trabajador
          </Button>
        </div>
      </form>
    </div>
  );
}
