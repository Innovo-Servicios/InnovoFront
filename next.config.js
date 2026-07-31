/** @type {import('next').NextConfig} */
const backendRoutePrefixes = [
  'cliente',
  'direccion',
  'lectura',
  'medidor',
  'ruta',
  'sector',
  'trabajador',
  'token',
  'asignacion',
  'notificaciones',
  'middleware',
  'novedad',
  'tipoNovedad',
  'notificacion_vista',
  'uvComentario',
  'comentarioDireccion',
  'tipoNotificacion',
  'documento',
  'documentoEmpresa',
  'document-preview',
  'tipoDocumento',
  'rol',
  'permiso',
  'excel',
  'assets',
  'verificacionTerreno',
  'bot',
  'whatsapp-web',
  'socket.io',
];

const nextConfig = {
  // Producción y el servidor de desarrollo pueden ejecutarse en paralelo sin
  // sobrescribir sus manifiestos de compilación.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:30001';
    return {
      afterFiles: [
        {
          source: '/api-backend/:path*',
          destination: `${backendUrl}/:path*`,
        },
        {
          source: '/socket.io',
          destination: `${backendUrl}/socket.io/`,
        },
        ...backendRoutePrefixes.map((prefix) => ({
          source: `/${prefix}/:path*`,
          destination: `${backendUrl}/${prefix}/:path*`,
        })),
      ],
    };
  },
};

export default nextConfig;
