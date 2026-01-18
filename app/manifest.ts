import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Thagora',
    short_name: 'Thagora',
    description: "Application de réservation des espaces communs de la résidence.",
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#D4AF37',
    icons: [
      // Idéalement fournir des PNG 192/512. À défaut, on réutilise les assets existants.
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/logo.jpeg', type: 'image/jpeg', purpose: 'any' },
      { src: '/logo.jpeg', type: 'image/jpeg', purpose: 'maskable' },
    ],
  }
}
