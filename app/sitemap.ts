import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // En un proyecto real, podrías obtener rutas de la DB aquí
  const routes = [
    '',
    '/adm',
    '/adm/direcciones',
    '/adm/followup',
    '/adm/notification',
    '/adm/novedades',
    '/adm/rutas',
    '/adm/workers',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
