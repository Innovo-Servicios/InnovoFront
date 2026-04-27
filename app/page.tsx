"use client";
import { useEffect, useState } from "react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button, Input, Textarea, Card, CardBody } from "@heroui/react";
import { Activity, BarChart, MapPin, Phone, Mail } from "lucide-react";
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
      <Navbar
        isBordered
        maxWidth="full"
        className="w-full h-16 px-4 md:px-10 bg-white"
      >
        <NavbarBrand className="max-w-fit">
          <p className="font-bold text-inherit text-2xl">INNOVO</p>
        </NavbarBrand>

        <NavbarContent
          className="hidden sm:flex gap-6"
          justify="center"
        >
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

          <NavbarItem>
            <Button
              color="primary"
              variant="light"
              size="md"
              onPress={handleAdminClick}
            >
              Login
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>
      
      <main className="flex-grow">
        <section
          id="inicio"
          className="relative text-white py-20 overflow-hidden min-h-[520px]"
        >
          {/* Imagen de fondo */}
          <Image
            src="/hero.png"
            alt="Dashboard de monitoreo de gas inteligente Innovo"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />

          {/* Capa azul encima de la imagen */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700/95 via-blue-600/85 to-blue-700/70" />

          {/* Contenido */}
          <div className="relative z-10 container mx-auto px-4 min-h-[400px] flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-5xl font-extrabold mb-4 leading-tight">
                Innovo Servicios <br />
                <span className="text-blue-200">Monitoreo de Flujo de Gas</span>
              </h1>

              <p className="text-xl mb-8 opacity-90">
                Servicios contratistas especializados en lectura de medidores de gas, con cobertura en Talca, La Serena y Valparaíso.
              </p>

              <div className="flex gap-4">
                <Button
                  as={Link}
                  href="#contacto"
                  color="primary"
                  size="lg"
                  className="bg-white text-blue-700 font-bold hover:bg-blue-50"
                >
                  Contacto
                </Button>
                <Button
                  as={Link}
                  href="#sobre-nosotros"
                  variant="bordered"
                  size="lg"
                  className="text-white border-white hover:bg-white/10"
                >
                  Saber más
                </Button>
              </div>
            </div>
          </div>
        </section>


        <section id="caracteristicas" className="py-20 bg-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Características Principales
              </h2>
          
              <p className="text-lg text-gray-600">
                Nuestra plataforma de monitoreo de flujo de gas ofrece una serie de características diseñadas para optimizar la gestión de tus servicios contratistas, brindándote información precisa y en tiempo real para una toma de decisiones informada.
              </p>

            </div>
              
            
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardBody className="p-6 text-center flex flex-col items-center">
                  <Activity className="h-12 w-12 text-blue-600 mb-4" />
          
                  <h3 className="text-xl font-semibold mb-2">
                    Monitoreo en Tiempo Real
                  </h3>
          
                  <p>
                    Obtén datos precisos sobre el flujo de gas en todo momento.
                  </p>
                </CardBody>
              </Card>
          
              <Card>
                <CardBody className="p-6 text-center flex flex-col items-center">
                  <BarChart className="h-12 w-12 text-blue-600 mb-4" />
          
                  <h3 className="text-xl font-semibold mb-2">
                    Análisis Avanzado
                  </h3>
          
                  <p>
                    Visualiza tendencias y genera informes detallados para optimizar tu consumo.
                  </p>
                </CardBody>
              </Card>
          
              <Card>
                <CardBody className="p-6 text-center flex flex-col items-center">
                  <Phone className="h-12 w-12 text-blue-600 mb-4" />
          
                  <h3 className="text-xl font-semibold mb-2">
                    Alertas Móviles
                  </h3>
          
                  <p>
                    Recibe notificaciones instantáneas en tu dispositivo móvil ante cualquier anomalía.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        {/* <section id="caracteristicas" className="py-20 bg-gray-100">
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
        </section> */}

        <section id="cobertura" className="py-20 bg-white scroll-mt-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Cobertura Operativa
              </h2>
          
              <p className="text-lg text-gray-600">
                Contamos con equipos en terreno para la lectura de medidores de gas en
                zonas estratégicas de la Región de Valparaíso, Talca y La Serena.
              </p>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  title: "Región de Valparaíso",
                  description:
                    "Cobertura operativa para servicios de lectura de medidores en distintas comunas de la zona.",
                },
                {
                  title: "Talca",
                  description:
                    "Equipo en terreno disponible para apoyar procesos operativos asociados a la lectura de medidores.",
                },
                {
                  title: "La Serena",
                  description:
                    "Servicio contratista orientado a la gestión eficiente y oportuna de lecturas en terreno.",
                },
              ].map((zone) => (
                <Card key={zone.title} className="border border-gray-200 shadow-sm">
                  <CardBody className="p-6 text-center">
                    <MapPin className="h-10 w-10 text-blue-600 mx-auto mb-4" />
              
                    <h3 className="text-xl font-semibold mb-2">
                      {zone.title}
                    </h3>
              
                    <p className="text-gray-600">
                      {zone.description}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="py-20 bg-gray-100 scroll-mt-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Contacto
              </h2>
          
              <p className="text-lg text-gray-600">
                Para consultas, solicitudes de servicio o coordinación de reuniones, no dudes en contactarnos a través de los siguientes medios:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[680px] mx-auto">
              <Card className="border border-gray-200 shadow-sm">
                <CardBody className="p-6 min-h-[190px] text-center flex flex-col items-center justify-center overflow-visible">
                  <Phone className="h-10 w-10 text-blue-600 mb-4" />

                  <h3 className="text-xl font-semibold mb-2">
                    Teléfono
                  </h3>

                  <p className="text-gray-600 mb-2">
                    Atención directa para consultas y coordinación de servicios.
                  </p>

                  <a
                    href="tel:+56912345678"
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    +56 9 1234 5678
                  </a>
                </CardBody>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardBody className="p-6 min-h-[190px] text-center flex flex-col items-center justify-center overflow-visible">
                  <Mail className="h-10 w-10 text-blue-600 mb-4" />

                  <h3 className="text-xl font-semibold mb-2">
                    Correo electrónico
                  </h3>

                  <p className="text-gray-600 mb-2">
                    Escríbenos para solicitar información o coordinar una reunión.
                  </p>

                  <a
                    href="mailto:contacto@innovoservicios.cl"
                    className="font-semibold text-blue-600 hover:text-blue-700 break-all"
                  >
                    contacto@innovoservicios.cl
                  </a>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

{/* 
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
        </section> */}

        <section id="sobre-nosotros" className="py-20 bg-white scroll-mt-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">
              Sobre Innovo Servicios
            </h2>

            <p className="max-w-4xl mx-auto text-lg text-gray-700 text-justify leading-relaxed">
              Innovo Servicios nace con el propósito de apoyar a empresas del rubro gas en sus procesos operativos en terreno, entregando un servicio confiable, ordenado y eficiente para la lectura de medidores. Como empresa contratista, nuestro trabajo se enfoca en la responsabilidad operativa, la coordinación de equipos y el cumplimiento de cada servicio asignado. Contamos con personal capacitado para ejecutar labores en terreno, manteniendo una comunicación clara y un enfoque constante en la calidad del servicio. Nuestra misión es contribuir a que las empresas puedan optimizar sus procesos de lectura, seguimiento y control operacional, reduciendo tiempos de gestión y fortaleciendo la continuidad del servicio. Nuestra visión es consolidarnos como un aliado estratégico para empresas del sector energético, destacando por nuestra eficiencia, compromiso y capacidad de adaptación en distintas zonas del país.
            </p>
          </div>
        </section>
      </main>
      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
