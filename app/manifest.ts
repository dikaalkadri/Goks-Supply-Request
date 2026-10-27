import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Goks! Supply Request',
    short_name: 'Goks! Supply',
    description: 'Ajukan dan pantau permintaan barang outlet.',
    start_url: '/requests',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8fafc',
    theme_color: '#6113a7',
    lang: 'id',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Logo has a full-bleed background with the text centred, so it is safe to crop
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
