"use client";
import { useEffect, useState } from "react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button, Input, Textarea, Card, CardBody } from "@heroui/react";
import { Activity, BarChart, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import LoginModal from "@/components/LoginModal";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const router = useRouter();
  const { token, authReady, refreshSession } = useAuth();

  const handleAdminClick = () => {
    if (!authReady) {
      return;
    }

    if (token) {
      router.push("/adm");
      return;
    }

    refreshSession().then((nextToken) => {
      if (nextToken) {
        router.push("/adm");
      } else {
        setIsLoginModalOpen(true);
      }
    });
  };

  useEffect(() => {
    if (authReady && token) {
      router.prefetch("/adm");
    }
  }, [authReady, token, router]);

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isBordered>
        <NavbarBrand>
          <p className="font-bold text-inherit">Innovo</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Link color="foreground" href="#inicio">
              Inicio
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#caracteristicas">
              Características
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#cobertura">
              Cobertura
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#contacto">
              Contacto
            </Link>
          </NavbarItem>
          <Button color="primary" variant="light" size="md" onPress={handleAdminClick}>
            Login
          </Button>
        </NavbarContent>
      </Navbar>

      <main className="flex-grow">
        <section id="inicio" className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-20 overflow-hidden">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0 z-10">
              <h1 className="text-5xl font-extrabold mb-4 leading-tight">
                Monitoreo de Flujo de Gas <br />
                <span className="text-blue-200">en Tiempo Real</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Optimiza tus operaciones con Innovo. Implementamos sensores inteligentes de última generación para el control total de consumo en la Quinta Región.
              </p>
              <div className="flex gap-4">
                <Button color="primary" size="lg" className="bg-white text-blue-700 font-bold hover:bg-blue-50">
                  Solicitar Demo
                </Button>
                <Button variant="bordered" size="lg" className="text-white border-white hover:bg-white/10">
                  Saber más
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 relative h-[400px] w-full">
              <Image 
                src="/hero.png" 
                alt="Dashboard de monitoreo de gas inteligente Innovo" 
                fill
                priority
                className="object-cover rounded-2xl shadow-2xl"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        <section id="caracteristicas" className="py-20 bg-gray-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Características Principales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardBody>
                  <Activity className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Monitoreo en Tiempo Real</h3>
                  <p>Obtén datos precisos sobre el flujo de gas en todo momento.</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <BarChart className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Análisis Avanzado</h3>
                  <p>Visualiza tendencias y genera informes detallados para optimizar tu consumo.</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Phone className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Alertas Móviles</h3>
                  <p>Recibe notificaciones instantáneas en tu dispositivo móvil ante cualquier anomalía.</p>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        <section id="cobertura" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Cobertura en la Quinta Región de Valparaíso</h2>
            <div className="flex flex-col md:flex-row items-center justify-center">
              <div className="md:w-1/2 mb-8 md:mb-0 bg-blue-50 rounded-xl p-8 text-center border-2 border-dashed border-blue-200">
                <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-blue-800 font-medium">Mapa de Cobertura en Proceso de Implementación</p>
                <p className="text-sm text-blue-600 mt-2">Pronto visualización interactiva de nodos activos.</p>
              </div>
              <div className="md:w-1/2 md:pl-12">
                <ul className="space-y-4">
                  {["Valparaíso", "Viña del Mar", "Quillota", "San Antonio"].map((city) => (
                    <li key={city} className="flex items-center">
                      <MapPin className="h-6 w-6 text-blue-600 mr-2" />
                      <span>{city}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="contacto" className="py-20 bg-gray-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Contáctanos</h2>
            <form className="max-w-lg mx-auto space-y-4">
              <Input type="text" label="Nombre" placeholder="Ingrese su nombre" />
              <Input type="email" label="Correo electrónico" placeholder="Ingrese su correo electrónico" />
              <Input type="tel" label="Teléfono" placeholder="Ingrese su número de teléfono" />
              <Textarea label="Mensaje" placeholder="Escriba su mensaje aquí" />
              <Button color="primary" size="lg" className="w-full">Enviar Mensaje</Button>
            </form>
          </div>
        </section>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
